ALTER TABLE public.yoti_age_checks ADD COLUMN environment text NOT NULL DEFAULT 'unknown' CHECK (environment IN ('unknown','sandbox','live'));
ALTER TABLE public.yoti_age_checks ADD COLUMN server_verified_at timestamptz;
CREATE INDEX yoti_age_checks_account_latest ON public.yoti_age_checks(user_id,created_at DESC,id DESC);
CREATE OR REPLACE FUNCTION public.can_upload_creator_media(_creator_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT _creator_id IS NOT NULL AND _creator_id=auth.uid()
 AND public.has_role(_creator_id,'creator')
 AND NOT EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=_creator_id)
 AND EXISTS(SELECT 1 FROM public.profiles WHERE user_id=_creator_id AND verification_status='approved')
 AND EXISTS(SELECT 1 FROM public.creator_verifications WHERE user_id=_creator_id AND status='approved' AND reviewed_at IS NOT NULL)
 AND COALESCE((SELECT status='passed' AND environment='live' AND server_verified_at IS NOT NULL FROM public.yoti_age_checks WHERE user_id=_creator_id ORDER BY created_at DESC,id DESC LIMIT 1),false)
$$;
REVOKE ALL ON FUNCTION public.can_upload_creator_media(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_upload_creator_media(uuid) TO authenticated,service_role;
COMMENT ON FUNCTION public.can_upload_creator_media(uuid) IS 'Account-owned creator uploads require server-reviewed approval and latest server-confirmed live adult Yoti result; legacy/sandbox results fail closed.';
CREATE POLICY "Creator content inserts require live age and approval" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (bucket_id NOT IN ('teasers','vault','creator-profile-photos','request-deliveries') OR public.can_upload_creator_media(auth.uid()));
CREATE POLICY "Creator content updates require live age and approval" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING (bucket_id NOT IN ('teasers','vault','creator-profile-photos','request-deliveries') OR public.can_upload_creator_media(auth.uid())) WITH CHECK (bucket_id NOT IN ('teasers','vault','creator-profile-photos','request-deliveries') OR public.can_upload_creator_media(auth.uid()));
CREATE POLICY "Creator media registration requires live age and approval" ON public.creator_media AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_upload_creator_media(creator_id));
CREATE POLICY "Creator media replacement requires live age and approval" ON public.creator_media AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_upload_creator_media(creator_id)) WITH CHECK (public.can_upload_creator_media(creator_id));
CREATE POLICY "Creator photo registration requires live age and approval" ON public.creator_profile_photos AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.can_upload_creator_media(creator_id));
CREATE POLICY "Creator photo replacement requires live age and approval" ON public.creator_profile_photos AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.can_upload_creator_media(creator_id)) WITH CHECK (public.can_upload_creator_media(creator_id));
CREATE POLICY "Verification submissions cannot self approve" ON public.creator_verifications AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (status='pending' AND reviewed_at IS NULL AND reviewer_id IS NULL AND reviewer_notes IS NULL);
CREATE OR REPLACE FUNCTION public.can_upload_request_delivery(_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.can_upload_creator_media(auth.uid()) AND EXISTS(SELECT 1 FROM public.custom_requests r WHERE r.creator_id=auth.uid() AND r.status IN ('accepted','paid') AND r.delivery_path IS NULL AND split_part(_name,'/',1)=r.creator_id::text AND split_part(_name,'/',2)=r.id::text AND (r.expires_at IS NULL OR r.expires_at>now() OR r.status='paid'))
$$;
REVOKE ALL ON FUNCTION public.can_upload_request_delivery(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_upload_request_delivery(text) TO authenticated,service_role;