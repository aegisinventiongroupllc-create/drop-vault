REVOKE ALL ON public.yoti_age_checks FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.yoti_age_checks TO authenticated;
GRANT ALL ON public.yoti_age_checks TO service_role;
CREATE OR REPLACE FUNCTION public.can_upload_creator_media(_creator_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT _creator_id IS NOT NULL AND auth.uid() IS NOT NULL AND _creator_id=auth.uid()
 AND public.has_role(_creator_id,'creator')
 AND NOT EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=_creator_id)
 AND EXISTS(SELECT 1 FROM public.profiles WHERE user_id=_creator_id AND verification_status='approved')
 AND EXISTS(SELECT 1 FROM public.creator_verifications WHERE user_id=_creator_id AND status='approved' AND reviewed_at IS NOT NULL)
 AND COALESCE((SELECT status='passed' AND environment='live' AND server_verified_at IS NOT NULL FROM public.yoti_age_checks WHERE user_id=_creator_id ORDER BY created_at DESC,id DESC LIMIT 1),false)
$$;
REVOKE ALL ON FUNCTION public.can_upload_creator_media(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_upload_creator_media(uuid) TO authenticated,service_role;