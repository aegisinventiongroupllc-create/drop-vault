REVOKE ALL ON public.media_view_receipts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.media_view_receipts TO service_role;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid,_role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=_user_id AND r.role=_role)
 AND (
 _user_id=auth.uid() OR auth.role()='service_role'
 OR EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id=auth.uid() AND a.role='admin')
 OR (_role IN ('creator','customer') AND EXISTS (SELECT 1 FROM public.public_profiles p WHERE p.user_id=_user_id AND p.role=_role::text))
 ),false);
$$;