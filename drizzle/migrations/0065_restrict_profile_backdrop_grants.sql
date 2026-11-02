REVOKE ALL ON public.profile_backdrop_settings FROM anon,authenticated;
GRANT SELECT ON public.profile_backdrop_settings TO authenticated;
GRANT ALL ON public.profile_backdrop_settings TO service_role;