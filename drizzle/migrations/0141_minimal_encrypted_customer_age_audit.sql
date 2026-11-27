CREATE TABLE public.customer_age_audits(user_id uuid PRIMARY KEY,encrypted_decision text NOT NULL);
GRANT ALL ON public.customer_age_audits TO service_role;
REVOKE ALL ON public.customer_age_audits FROM anon,authenticated;
ALTER TABLE public.customer_age_audits ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.customer_age_audits IS 'AES-GCM encrypted verification timestamp, pass/fail status and expiration date only; no identity document numbers, names, DOB, images or biometric templates. Account UUID links the audit to the private account.';
CREATE FUNCTION public.finalize_customer_age_review(_id uuid,_encrypted text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r public.dtt_identity_reviews; BEGIN
IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service authorization required'; END IF;
IF _encrypted IS NULL OR length(_encrypted) NOT BETWEEN 32 AND 4096 THEN RAISE EXCEPTION 'Encrypted audit required'; END IF;
SELECT * INTO r FROM public.dtt_identity_reviews WHERE id=_id AND audience='customer' AND status IN ('approved','rejected') FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Final customer decision required'; END IF;
IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='dtt-identity-review' AND name IN(r.id_front_path,r.id_back_path,r.selfie_path,r.face_video_path)) THEN RAISE EXCEPTION 'Delete customer evidence before finalizing'; END IF;
IF r.status='approved' THEN
IF NOT r.face_confirmed OR NOT r.identity_confirmed OR r.reviewer_id IS NULL OR NOT public.has_role(r.reviewer_id,'admin') OR r.reviewed_at IS NULL OR r.document_expires_on<current_date OR r.date_of_birth>(current_date-interval '18 years')::date THEN RAISE EXCEPTION 'Human adult approval required'; END IF;
INSERT INTO public.customer_launch_waitlist(user_id,country,language) VALUES(r.user_id,r.country,'en') ON CONFLICT(user_id) DO NOTHING;
END IF;
INSERT INTO public.customer_age_audits(user_id,encrypted_decision) VALUES(r.user_id,_encrypted) ON CONFLICT(user_id) DO UPDATE SET encrypted_decision=EXCLUDED.encrypted_decision;
DELETE FROM public.dtt_identity_reviews WHERE id=r.id AND audience='customer'; END $$;
REVOKE ALL ON FUNCTION public.finalize_customer_age_review(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_customer_age_review(uuid,text) TO service_role;
CREATE FUNCTION public.my_customer_age_collection_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Account sign-in required'; END IF;
RETURN jsonb_build_object('collection_ready',public.dtt_identity_collection_ready()); END $$;
REVOKE ALL ON FUNCTION public.my_customer_age_collection_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_customer_age_collection_status() TO authenticated;
COMMENT ON FUNCTION public.finalize_customer_age_review(uuid,text) IS 'Customer-only immediate cleanup finalization; creator 2257 evidence excluded. Collection remains paused until reliable deletion retry, backup lifecycle and statutory retention are reviewed.';