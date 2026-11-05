CREATE TABLE public.creator_consent_withdrawals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 creator_id uuid NOT NULL UNIQUE,
 kind text NOT NULL CHECK (kind IN ('withdraw','delete_account')),
 reason text CHECK (char_length(reason) <= 1000),
 media_count integer NOT NULL DEFAULT 0,
 provider_removed integer NOT NULL DEFAULT 0,
 provider_failed integer NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','completed','completed_with_errors')),
 account_deletion_status text NOT NULL DEFAULT 'not_requested' CHECK (account_deletion_status IN ('not_requested','pending_admin','completed')),
 requested_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz
);
GRANT SELECT ON public.creator_consent_withdrawals TO authenticated;
GRANT ALL ON public.creator_consent_withdrawals TO service_role;
ALTER TABLE public.creator_consent_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and admins read withdrawals" ON public.creator_consent_withdrawals FOR SELECT TO authenticated
 USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.creator_compliance_archive (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 withdrawal_id uuid NOT NULL REFERENCES public.creator_consent_withdrawals(id),
 creator_id uuid NOT NULL,
 snapshot jsonb NOT NULL,
 archived_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.creator_compliance_archive TO service_role;
REVOKE ALL ON public.creator_compliance_archive FROM PUBLIC, anon, authenticated;
ALTER TABLE public.creator_compliance_archive ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.creator_media_retention (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 media_id uuid NOT NULL,
 creator_id uuid NOT NULL,
 bucket text NOT NULL,
 storage_path text NOT NULL,
 title text NOT NULL,
 media_type text NOT NULL,
 uploaded_at timestamptz NOT NULL,
 removed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.creator_media_retention TO service_role;
REVOKE ALL ON public.creator_media_retention FROM PUBLIC, anon, authenticated;
ALTER TABLE public.creator_media_retention ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.keep_retention_records_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Retained compliance records cannot be changed or deleted'; END $$;
CREATE TRIGGER keep_compliance_archive_immutable BEFORE UPDATE OR DELETE ON public.creator_compliance_archive FOR EACH ROW EXECUTE FUNCTION public.keep_retention_records_immutable();
CREATE TRIGGER keep_media_retention_immutable BEFORE UPDATE OR DELETE ON public.creator_media_retention FOR EACH ROW EXECUTE FUNCTION public.keep_retention_records_immutable();

CREATE FUNCTION public.retain_deleted_creator_media() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.creator_media_retention(media_id,creator_id,bucket,storage_path,title,media_type,uploaded_at)
 VALUES (OLD.id,OLD.creator_id,OLD.bucket,OLD.storage_path,OLD.title,OLD.media_type,OLD.created_at);
 RETURN OLD;
END $$;
CREATE TRIGGER retain_deleted_creator_media AFTER DELETE ON public.creator_media FOR EACH ROW EXECUTE FUNCTION public.retain_deleted_creator_media();

CREATE TABLE public.data_retention_policies (
 category text PRIMARY KEY,
 retention text NOT NULL,
 basis text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.data_retention_policies TO authenticated;
GRANT ALL ON public.data_retention_policies TO service_role;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read retention policies" ON public.data_retention_policies FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.data_retention_policies(category,retention,basis) VALUES
 ('User accounts','Active life of account; compliance-linked identity kept 7 years after last related content','Pending legal review'),
 ('Transaction history','7 years from transaction','Tax and payment-dispute records; pending legal review'),
 ('Creator upload records','7 years after upload or removal','Retained even after media deletion or withdrawal'),
 ('§ 2257 performer records','7 years from creation or last amendment (5 years after operations end)','28 CFR 75.4; pending legal review'),
 ('Consent withdrawals','Permanent audit log','Proof of removal and preserved records');

CREATE TABLE public.backup_verification_checks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 checked_by uuid NOT NULL DEFAULT auth.uid(),
 newest_backup_at timestamptz NOT NULL,
 export_downloaded boolean NOT NULL DEFAULT false,
 storage_downloaded boolean NOT NULL DEFAULT false,
 notes text CHECK (char_length(notes) <= 500),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.backup_verification_checks TO authenticated;
GRANT ALL ON public.backup_verification_checks TO service_role;
ALTER TABLE public.backup_verification_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read backup checks" ON public.backup_verification_checks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins record backup checks" ON public.backup_verification_checks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND checked_by = auth.uid());

CREATE FUNCTION public.record_creator_withdrawal(_creator uuid, _kind text, _reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE wid uuid; n integer;
BEGIN
 IF _kind NOT IN ('withdraw','delete_account') THEN RAISE EXCEPTION 'invalid kind'; END IF;
 SELECT count(*) INTO n FROM public.creator_media WHERE creator_id = _creator;
 INSERT INTO public.creator_consent_withdrawals(creator_id,kind,reason,media_count,account_deletion_status)
 VALUES (_creator,_kind,left(_reason,1000),n,CASE WHEN _kind='delete_account' THEN 'pending_admin' ELSE 'not_requested' END)
 ON CONFLICT (creator_id) DO UPDATE SET kind = CASE WHEN EXCLUDED.kind='delete_account' THEN 'delete_account' ELSE creator_consent_withdrawals.kind END,
   account_deletion_status = CASE WHEN EXCLUDED.kind='delete_account' AND creator_consent_withdrawals.account_deletion_status='not_requested' THEN 'pending_admin' ELSE creator_consent_withdrawals.account_deletion_status END
 RETURNING id INTO wid;
 INSERT INTO public.creator_compliance_archive(withdrawal_id,creator_id,snapshot) VALUES (wid,_creator,jsonb_build_object(
  'verifications',(SELECT coalesce(jsonb_agg(to_jsonb(v)),'[]') FROM public.creator_verifications v WHERE v.user_id=_creator),
  'manifests',(SELECT coalesce(jsonb_agg(to_jsonb(m)),'[]') FROM public.content_manifests m WHERE m.creator_id=_creator),
  'participants',(SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]') FROM public.content_participants p WHERE p.creator_id=_creator),
  'consents',(SELECT coalesce(jsonb_agg(to_jsonb(c)),'[]') FROM public.participant_consents c JOIN public.content_manifests m ON m.id=c.manifest_id WHERE m.creator_id=_creator),
  'performer_index',(SELECT coalesce(jsonb_agg(to_jsonb(i)),'[]') FROM public.content_performer_index i WHERE i.creator_id=_creator),
  'media',(SELECT coalesce(jsonb_agg(to_jsonb(cm)),'[]') FROM public.creator_media cm WHERE cm.creator_id=_creator)));
 UPDATE public.creator_media SET active_until = now() WHERE creator_id=_creator AND (active_until IS NULL OR active_until > now());
 UPDATE public.bunny_video_deliveries SET state='deleting' WHERE creator_id=_creator;
 RETURN wid;
END $$;
REVOKE ALL ON FUNCTION public.record_creator_withdrawal(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_creator_withdrawal(uuid,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_active_teasers()
 RETURNS SETOF creator_media LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT DISTINCT ON (creator_id) m.* FROM public.creator_media m WHERE bucket='teasers' AND NOT EXISTS(SELECT 1 FROM public.creator_consent_withdrawals w WHERE w.creator_id=m.creator_id) ORDER BY creator_id, (active_from<=now() AND active_until>now()) DESC NULLS LAST, created_at DESC $function$;

CREATE OR REPLACE FUNCTION public.content_is_cleared(_bucket text, _path text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
 SELECT EXISTS(SELECT 1 FROM public.content_manifests m WHERE m.bucket=_bucket AND m.storage_path=_path AND m.status='approved' AND m.complete_declaration AND m.includes_uploader AND m.identity_confirmed AND m.age_at_recording_confirmed AND m.participants_confirmed AND m.rights_confirmed AND m.reviewer_id IS NOT NULL AND m.reviewed_at IS NOT NULL AND m.recorded_on<=current_date
 AND EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id=m.bucket AND o.name=m.storage_path AND o.updated_at=m.object_updated_at)
 AND EXISTS(SELECT 1 FROM public.creator_verifications v WHERE v.user_id=m.creator_id AND v.status='approved' AND v.identity_confirmed AND v.reviewed_at IS NOT NULL AND v.date_of_birth<=(m.recorded_on-interval '18 years')::date AND v.id=(SELECT id FROM public.creator_verifications WHERE user_id=m.creator_id ORDER BY submitted_at DESC,id DESC LIMIT 1))
 AND NOT EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=m.creator_id)
 AND NOT EXISTS(SELECT 1 FROM public.creator_consent_withdrawals w WHERE w.creator_id=m.creator_id)
 AND NOT EXISTS(SELECT 1 FROM unnest(m.participant_ids) pid LEFT JOIN public.content_participants p ON p.id=pid WHERE p.id IS NULL OR p.creator_id<>m.creator_id OR p.status<>'approved' OR NOT p.identity_confirmed OR p.reviewed_at IS NULL OR p.reviewer_id IS NULL OR p.date_of_birth IS NULL OR p.date_of_birth>(m.recorded_on-interval '18 years')::date OR NOT EXISTS(SELECT 1 FROM public.participant_consents c WHERE c.manifest_id=m.id AND c.participant_id=p.id AND c.revoked_at IS NULL)))
$function$;

DROP POLICY "Custodian notice is public" ON public.records_custodian;
REVOKE SELECT ON public.records_custodian FROM anon, authenticated;
CREATE FUNCTION public.get_records_custodian() RETURNS TABLE(custodian_name text, inspection_address text, compliance_email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT custodian_name, inspection_address, compliance_email FROM public.records_custodian WHERE id $$;
GRANT EXECUTE ON FUNCTION public.get_records_custodian() TO anon, authenticated;