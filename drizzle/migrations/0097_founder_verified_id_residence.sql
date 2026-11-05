ALTER TABLE public.creator_verifications ADD COLUMN residence_country text, ADD COLUMN residence_id_confirmed boolean NOT NULL DEFAULT false, ADD COLUMN residence_reviewed_by uuid, ADD COLUMN residence_reviewed_at timestamptz;
CREATE FUNCTION public.protect_verified_residence() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF TG_OP='INSERT' THEN IF NEW.residence_country IS NOT NULL OR NEW.residence_id_confirmed OR NEW.residence_reviewed_by IS NOT NULL OR NEW.residence_reviewed_at IS NOT NULL THEN RAISE EXCEPTION 'Residence is reviewer-managed'; END IF;
ELSIF (NEW.residence_country,NEW.residence_id_confirmed,NEW.residence_reviewed_by,NEW.residence_reviewed_at) IS DISTINCT FROM (OLD.residence_country,OLD.residence_id_confirmed,OLD.residence_reviewed_by,OLD.residence_reviewed_at) THEN
IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') OR auth.uid()=NEW.user_id OR OLD.status NOT IN ('pending','flagged') THEN RAISE EXCEPTION 'Independent administrator residence review required'; END IF;
IF NEW.residence_id_confirmed AND (NEW.residence_country IS NULL OR NEW.residence_country !~ '^[A-Z]{2}$' OR NEW.residence_reviewed_by IS DISTINCT FROM auth.uid() OR NEW.residence_reviewed_at IS NULL OR NEW.document_expires_on IS NULL OR NEW.document_expires_on<current_date) THEN RAISE EXCEPTION 'Current address-bearing ID residence confirmation required'; END IF;
END IF; RETURN NEW; END $$;
CREATE TRIGGER protect_verified_residence BEFORE INSERT OR UPDATE ON public.creator_verifications FOR EACH ROW EXECUTE FUNCTION public.protect_verified_residence();
CREATE FUNCTION public.review_creator_identity_with_residence(_id uuid,_status text,_notes text,_confirmed boolean,_residence_country text,_residence_confirmed boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator sign-in required'; END IF;
IF _status='approved' THEN UPDATE public.creator_verifications SET residence_country=CASE WHEN _residence_confirmed THEN upper(trim(_residence_country)) ELSE NULL END,residence_id_confirmed=coalesce(_residence_confirmed,false),residence_reviewed_by=CASE WHEN _residence_confirmed THEN auth.uid() END,residence_reviewed_at=CASE WHEN _residence_confirmed THEN now() END WHERE id=_id AND status IN ('pending','flagged'); END IF;
RETURN public.review_creator_identity(_id,_status,_notes,_confirmed); END $$;
REVOKE ALL ON FUNCTION public.review_creator_identity_with_residence(uuid,text,text,boolean,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_creator_identity_with_residence(uuid,text,text,boolean,text,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.claim_founding_slot(_creator_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE _c text; _s text; _n int; BEGIN
IF EXISTS(SELECT 1 FROM public.founding_creators WHERE creator_id=_creator_id) THEN RETURN; END IF;
SELECT v.residence_country,p.vault_side INTO _c,_s FROM public.creator_verifications v JOIN public.profiles p ON p.user_id=v.user_id WHERE v.user_id=_creator_id AND v.status='approved' AND v.identity_confirmed AND v.residence_id_confirmed AND v.residence_reviewed_by IS NOT NULL AND v.residence_reviewed_at IS NOT NULL AND v.document_expires_on>=current_date AND p.verification_status='approved' AND public.has_role(_creator_id,'creator') ORDER BY v.reviewed_at DESC,v.id LIMIT 1;
IF _c IS NULL OR _c !~ '^[A-Z]{2}$' OR _s IS NULL OR _s NOT IN ('men','women') THEN RETURN; END IF;
PERFORM pg_advisory_xact_lock(hashtext('founding:'||_c||':'||_s));
SELECT count(*) INTO _n FROM public.founding_creators WHERE country=_c AND vault_side=_s;
IF _n>=5 THEN RETURN; END IF;
INSERT INTO public.founding_creators(creator_id,country,vault_side,slot,split_creator,split_platform,ends_at) VALUES(_creator_id,_c,_s,_n+1,91,9,'9999-12-31 00:00:00+00') ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.claim_founding_slot(uuid) FROM PUBLIC,anon,authenticated;
CREATE INDEX creator_review_country_queue ON public.creator_verifications(country,submitted_at,id);