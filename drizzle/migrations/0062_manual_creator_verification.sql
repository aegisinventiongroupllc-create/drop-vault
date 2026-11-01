ALTER TABLE public.creator_verifications ADD COLUMN document_bucket text NOT NULL DEFAULT 'id-verifications', ADD COLUMN country text, ADD COLUMN creator_username text, ADD COLUMN identity_confirmed boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN is_verified boolean NOT NULL DEFAULT false;
CREATE INDEX creator_verifications_country_pending ON public.creator_verifications(country,status,submitted_at DESC);
REVOKE INSERT,UPDATE,DELETE ON public.creator_verifications FROM authenticated;
GRANT SELECT ON public.creator_verifications TO authenticated;
GRANT ALL ON public.creator_verifications TO service_role;
CREATE OR REPLACE FUNCTION public.protect_profile_identity_review() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF current_user IN ('authenticated','anon') AND (NEW.verification_status IS DISTINCT FROM OLD.verification_status OR NEW.is_verified IS DISTINCT FROM OLD.is_verified OR NEW.verification_reviewed_at IS DISTINCT FROM OLD.verification_reviewed_at OR NEW.verification_reviewer_notes IS DISTINCT FROM OLD.verification_reviewer_notes OR NEW.legal_first_name IS DISTINCT FROM OLD.legal_first_name OR NEW.legal_last_name IS DISTINCT FROM OLD.legal_last_name OR NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth) THEN RAISE EXCEPTION 'Identity fields are server managed'; END IF; RETURN NEW; END $$;
CREATE TRIGGER protect_profile_identity_review BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_identity_review();
CREATE OR REPLACE FUNCTION public.sync_profile_verification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
 UPDATE public.profiles SET verification_status=NEW.status,is_verified=(NEW.status='approved'),verification_submitted_at=NEW.submitted_at,verification_reviewed_at=NEW.reviewed_at,verification_reviewer_notes=NEW.reviewer_notes,legal_first_name=NEW.legal_first_name,legal_last_name=NEW.legal_last_name,date_of_birth=NEW.date_of_birth WHERE user_id=NEW.user_id;
 END IF; RETURN NEW; END $$;
CREATE TRIGGER sync_profile_verification_submission AFTER INSERT ON public.creator_verifications FOR EACH ROW EXECUTE FUNCTION public.sync_profile_verification();
CREATE OR REPLACE FUNCTION public.submit_creator_identity(_full_name text,_dob date,_front text,_selfie text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE _uid uuid:=auth.uid(); _id uuid; _profile public.profiles; BEGIN
 IF _uid IS NULL OR NOT public.has_role(_uid,'creator') THEN RAISE EXCEPTION 'Creator sign-in required'; END IF;
 SELECT * INTO _profile FROM public.profiles WHERE user_id=_uid FOR UPDATE;
 IF NOT FOUND OR _profile.verification_status='approved' THEN RAISE EXCEPTION 'Submission unavailable'; END IF;
 IF length(trim(_full_name)) NOT BETWEEN 2 AND 160 OR _dob IS NULL OR _dob> (current_date-interval '18 years')::date OR _dob < (current_date-interval '120 years')::date THEN RAISE EXCEPTION 'Valid adult identity required'; END IF;
 IF EXISTS(SELECT 1 FROM public.creator_verifications WHERE user_id=_uid AND status='pending') THEN RAISE EXCEPTION 'A submission is already pending'; END IF;
 IF _front=_selfie OR split_part(_front,'/',1)<>_uid::text OR split_part(_selfie,'/',1)<>_uid::text THEN RAISE EXCEPTION 'Invalid document ownership'; END IF;
 IF (SELECT count(*) FROM storage.objects WHERE bucket_id='identity-documents' AND name IN (_front,_selfie) AND owner_id=_uid::text AND lower(metadata->>'mimetype') IN ('image/jpeg','image/png','image/webp') AND (metadata->>'size')::bigint BETWEEN 1 AND 10485760)<>2 THEN RAISE EXCEPTION 'Two valid owned images required'; END IF;
 INSERT INTO public.creator_verifications(user_id,legal_first_name,legal_last_name,date_of_birth,id_front_path,id_back_path,selfie_path,status,document_bucket,country,creator_username) VALUES(_uid,trim(_full_name),'',_dob,_front,'',_selfie,'pending','identity-documents',upper(_profile.country),_profile.display_name) RETURNING id INTO _id;
 RETURN _id; END $$;
REVOKE ALL ON FUNCTION public.submit_creator_identity(text,date,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_creator_identity(text,date,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.review_creator_identity(_id uuid,_status text,_notes text,_confirmed boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE _r public.creator_verifications; BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator sign-in required'; END IF;
 SELECT * INTO _r FROM public.creator_verifications WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR _r.status<>'pending' THEN RAISE EXCEPTION 'Submission already reviewed or unavailable'; END IF;
 IF _r.user_id=auth.uid() THEN RAISE EXCEPTION 'Self review is forbidden'; END IF;
 IF _status NOT IN ('approved','rejected') OR length(coalesce(_notes,''))>1000 THEN RAISE EXCEPTION 'Invalid decision'; END IF;
 IF _status='rejected' AND length(trim(coalesce(_notes,'')))=0 THEN RAISE EXCEPTION 'Decline reason required'; END IF;
 IF _status='approved' THEN
 IF NOT coalesce(_confirmed,false) OR NOT public.has_role(_r.user_id,'creator') OR _r.date_of_birth>(current_date-interval '18 years')::date OR _r.date_of_birth<(current_date-interval '120 years')::date THEN RAISE EXCEPTION 'Confirmed adult creator identity required'; END IF;
 IF split_part(_r.id_front_path,'/',1)<>_r.user_id::text OR split_part(_r.selfie_path,'/',1)<>_r.user_id::text OR _r.id_front_path=_r.selfie_path OR _r.document_bucket NOT IN ('identity-documents','id-verifications') THEN RAISE EXCEPTION 'Invalid identity evidence'; END IF;
 IF (SELECT count(*) FROM storage.objects WHERE bucket_id=_r.document_bucket AND name IN (_r.id_front_path,_r.selfie_path))<>2 THEN RAISE EXCEPTION 'Identity evidence missing'; END IF;
 END IF;
 UPDATE public.creator_verifications SET status=_status,reviewer_id=auth.uid(),reviewed_at=now(),reviewer_notes=nullif(trim(_notes),''),identity_confirmed=(_status='approved' AND _confirmed) WHERE id=_id;
 RETURN _r.user_id; END $$;
REVOKE ALL ON FUNCTION public.review_creator_identity(uuid,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_creator_identity(uuid,text,text,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.can_upload_creator_media(_creator_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT _creator_id IS NOT NULL AND auth.uid() IS NOT NULL AND _creator_id=auth.uid() AND public.has_role(_creator_id,'creator') AND NOT EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=_creator_id)
 AND EXISTS(SELECT 1 FROM public.profiles WHERE user_id=_creator_id AND verification_status='approved')
 AND COALESCE((SELECT status='approved' AND reviewed_at IS NOT NULL AND reviewer_id IS NOT NULL AND identity_confirmed AND date_of_birth<=(current_date-interval '18 years')::date AND date_of_birth>=(current_date-interval '120 years')::date FROM public.creator_verifications WHERE user_id=_creator_id ORDER BY submitted_at DESC,id DESC LIMIT 1),false)
 $$;
REVOKE ALL ON FUNCTION public.can_upload_creator_media(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_upload_creator_media(uuid) TO authenticated,service_role;
CREATE POLICY "Creators upload own identity documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='identity-documents' AND (storage.foldername(name))[1]=auth.uid()::text AND public.has_role(auth.uid(),'creator'));
CREATE POLICY "Owners and administrators read identity documents" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='identity-documents' AND ((storage.foldername(name))[1]=auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "Creators clean unattached identity uploads" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='identity-documents' AND (storage.foldername(name))[1]=auth.uid()::text AND NOT EXISTS(SELECT 1 FROM public.creator_verifications WHERE document_bucket='identity-documents' AND name IN (id_front_path,selfie_path)));