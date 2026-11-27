CREATE TABLE public.dtt_identity_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, audience text NOT NULL CHECK(audience IN ('customer','creator')), creator_verification_id uuid UNIQUE,
 legal_first_name text NOT NULL, legal_last_name text NOT NULL DEFAULT '', date_of_birth date NOT NULL, id_front_path text NOT NULL, id_back_path text NOT NULL, selfie_path text NOT NULL, face_video_path text NOT NULL, document_bucket text NOT NULL, country text, creator_username text, document_expires_on date NOT NULL, document_type text NOT NULL, issuing_country text NOT NULL, document_number text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','flagged','approved','rejected')), submitted_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz, reviewer_id uuid, reviewer_notes text, identity_confirmed boolean NOT NULL DEFAULT false, face_confirmed boolean NOT NULL DEFAULT false, capture_consent_version text NOT NULL DEFAULT 'dtt-manual-face-v1', capture_consented_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.dtt_identity_reviews FROM anon,authenticated;
GRANT SELECT ON public.dtt_identity_reviews TO authenticated;
GRANT ALL ON public.dtt_identity_reviews TO service_role;
ALTER TABLE public.dtt_identity_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Account and admin private identity reads" ON public.dtt_identity_reviews FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX dtt_identity_queue ON public.dtt_identity_reviews(audience,country,submitted_at,id);
CREATE INDEX dtt_identity_owner ON public.dtt_identity_reviews(user_id,audience,submitted_at DESC);
CREATE FUNCTION public.dtt_review_evidence_referenced(_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.dtt_identity_reviews WHERE _path IN(id_front_path,id_back_path,selfie_path,face_video_path)); $$;
REVOKE ALL ON FUNCTION public.dtt_review_evidence_referenced(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dtt_review_evidence_referenced(text) TO authenticated,service_role;
CREATE POLICY "Owned DTT identity staging" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='dtt-identity-review' AND split_part(name,'/',1)=auth.uid()::text AND (public.has_role(auth.uid(),'customer') OR public.has_role(auth.uid(),'creator')));
CREATE POLICY "Private DTT identity evidence" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='dtt-identity-review' AND (split_part(name,'/',1)=auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "Clean unattached DTT evidence" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='dtt-identity-review' AND split_part(name,'/',1)=auth.uid()::text AND NOT public.dtt_review_evidence_referenced(name));
CREATE FUNCTION public.submit_dtt_identity(_audience text,_full_name text,_dob date,_front text,_back text,_selfie text,_face text,_expires date,_type text,_country text,_number text,_consent boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); p public.profiles; result uuid; creator_id uuid; b text; BEGIN
IF u IS NULL OR _audience NOT IN ('customer','creator') OR NOT public.has_role(u,_audience::public.app_role) OR EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=u) THEN RAISE EXCEPTION 'Account sign-in required'; END IF;
SELECT * INTO p FROM public.profiles WHERE user_id=u FOR UPDATE;
IF NOT FOUND OR EXISTS(SELECT 1 FROM public.dtt_identity_reviews WHERE user_id=u AND audience=_audience AND status IN ('pending','flagged','approved')) THEN RAISE EXCEPTION 'Submission unavailable'; END IF;
IF NOT coalesce(_consent,false) THEN RAISE EXCEPTION 'Private face-review consent required'; END IF;
IF _full_name IS NULL OR length(trim(_full_name)) NOT BETWEEN 2 AND 160 OR _dob IS NULL OR _dob>(current_date-interval '18 years')::date OR _dob<(current_date-interval '120 years')::date THEN RAISE EXCEPTION 'Valid adult identity required'; END IF;
IF _expires IS NULL OR _type NOT IN ('passport','national_id','drivers_license','other') OR _country IS NULL OR _country !~ '^[A-Z]{2}$' OR _number IS NULL OR length(trim(_number)) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Document details required'; END IF;
b:=CASE WHEN _audience='creator' THEN 'creator-2257-records' ELSE 'dtt-identity-review' END;
IF _front IS NULL OR _back IS NULL OR _selfie IS NULL OR _face IS NULL OR cardinality(ARRAY(SELECT DISTINCT unnest(ARRAY[_front,_back,_selfie,_face])))<>4 OR split_part(_front,'/',1)<>u::text OR split_part(_back,'/',1)<>u::text OR split_part(_selfie,'/',1)<>u::text OR split_part(_face,'/',1)<>u::text THEN RAISE EXCEPTION 'Distinct owned evidence required'; END IF;
IF (SELECT count(*) FROM storage.objects WHERE bucket_id=b AND name IN(_front,_back,_selfie) AND owner_id=u::text AND lower(metadata->>'mimetype') IN('image/jpeg','image/png','image/webp') AND (metadata->>'size')::bigint BETWEEN 1 AND 10485760)<>3 THEN RAISE EXCEPTION 'Three valid owned images required'; END IF;
IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='dtt-identity-review' AND name=_face AND owner_id=u::text AND lower(metadata->>'mimetype') IN('video/webm','video/mp4') AND (metadata->>'size')::bigint BETWEEN 1 AND 10485760) THEN RAISE EXCEPTION 'Owned face-review video required'; END IF;
INSERT INTO public.dtt_identity_reviews(user_id,audience,legal_first_name,date_of_birth,id_front_path,id_back_path,selfie_path,face_video_path,document_bucket,country,creator_username,document_expires_on,document_type,issuing_country,document_number,status) VALUES(u,_audience,trim(_full_name),_dob,_front,_back,_selfie,_face,b,upper(p.country),p.display_name,_expires,_type,_country,trim(_number),CASE WHEN _expires<current_date THEN 'flagged' ELSE 'pending' END) RETURNING id INTO result;
IF _audience='creator' THEN creator_id:=public.submit_creator_identity_v2(_full_name,_dob,_front,_back,_selfie,_expires,_type,_country,_number); UPDATE public.dtt_identity_reviews SET creator_verification_id=creator_id WHERE id=result; END IF;
RETURN result; END $$;
REVOKE ALL ON FUNCTION public.submit_dtt_identity(text,text,date,text,text,text,text,date,text,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_dtt_identity(text,text,date,text,text,text,text,date,text,text,text,boolean) TO authenticated;
CREATE FUNCTION public.guard_new_creator_face_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NOT EXISTS(SELECT 1 FROM public.dtt_identity_reviews WHERE user_id=NEW.user_id AND audience='creator' AND status IN ('pending','flagged') AND id_front_path=NEW.id_front_path AND selfie_path=NEW.selfie_path AND creator_verification_id IS NULL) THEN RAISE EXCEPTION 'Submit with private face-review evidence'; END IF; RETURN NEW; END $$;
CREATE TRIGGER require_new_creator_face BEFORE INSERT ON public.creator_verifications FOR EACH ROW EXECUTE FUNCTION public.guard_new_creator_face_review();
CREATE FUNCTION public.guard_creator_face_approval() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NEW.status='approved' AND OLD.status IS DISTINCT FROM NEW.status AND EXISTS(SELECT 1 FROM public.dtt_identity_reviews WHERE creator_verification_id=NEW.id AND NOT(status='approved' AND face_confirmed AND identity_confirmed AND reviewer_id IS NOT NULL)) THEN RAISE EXCEPTION 'Human face review required'; END IF; RETURN NEW; END $$;
CREATE TRIGGER require_creator_face_approval BEFORE UPDATE ON public.creator_verifications FOR EACH ROW EXECUTE FUNCTION public.guard_creator_face_approval();
CREATE FUNCTION public.review_dtt_identity(_id uuid,_status text,_notes text,_confirmed boolean,_face_confirmed boolean,_residence_country text DEFAULT NULL,_residence_confirmed boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r public.dtt_identity_reviews; BEGIN
IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator sign-in required'; END IF;
SELECT * INTO r FROM public.dtt_identity_reviews WHERE id=_id FOR UPDATE;
IF NOT FOUND OR r.status NOT IN ('pending','flagged') OR _status NOT IN ('approved','rejected','flagged') THEN RAISE EXCEPTION 'Review unavailable'; END IF;
IF _status='approved' AND (NOT coalesce(_confirmed,false) OR NOT coalesce(_face_confirmed,false) OR r.document_expires_on<current_date OR r.date_of_birth>(current_date-interval '18 years')::date) THEN RAISE EXCEPTION 'Readable adult identity and human face confirmation required'; END IF;
IF _status IN('rejected','flagged') AND coalesce(length(trim(_notes)),0)=0 THEN RAISE EXCEPTION 'Review reason required'; END IF;
IF length(coalesce(_notes,''))>1000 THEN RAISE EXCEPTION 'Notes too long'; END IF;
UPDATE public.dtt_identity_reviews SET status=_status,reviewer_id=auth.uid(),reviewed_at=now(),reviewer_notes=nullif(trim(_notes),''),identity_confirmed=(_status='approved' AND _confirmed),face_confirmed=(_status='approved' AND _face_confirmed) WHERE id=_id;
IF r.audience='creator' THEN PERFORM public.review_creator_identity_with_residence(r.creator_verification_id,_status,_notes,_confirmed,_residence_country,_residence_confirmed); END IF;
INSERT INTO public.activity_logs(user_id,user_role,action_type,action_detail,metadata,activity_date) VALUES(auth.uid(),'admin','dtt_identity_decision','Recorded private human identity review',jsonb_build_object('review_id',r.id,'audience',r.audience,'status',_status),current_date);
RETURN r.user_id; END $$;
REVOKE ALL ON FUNCTION public.review_dtt_identity(uuid,text,text,boolean,boolean,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_dtt_identity(uuid,text,text,boolean,boolean,text,boolean) TO authenticated;
CREATE FUNCTION public.customer_identity_approved(_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.dtt_identity_reviews WHERE user_id=_user AND audience='customer' AND status='approved' AND identity_confirmed AND face_confirmed AND reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL AND document_expires_on>=current_date AND date_of_birth<=(current_date-interval '18 years')::date) AND NOT EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=_user); $$;
REVOKE ALL ON FUNCTION public.customer_identity_approved(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.customer_identity_approved(uuid) TO service_role;
CREATE FUNCTION public.guard_new_customer_ticket() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.customer_identity_approved(NEW.user_id) THEN RAISE EXCEPTION 'DTT adult identity approval required before ticket'; END IF; RETURN NEW; END $$;
CREATE TRIGGER customer_ticket_requires_identity BEFORE INSERT ON public.customer_launch_waitlist FOR EACH ROW EXECUTE FUNCTION public.guard_new_customer_ticket();
COMMENT ON TABLE public.dtt_identity_reviews IS 'Private human review evidence, not certified biometric liveness. Persona sandbox results cannot approve these records. Customer records never grant creator clearance.';