CREATE OR REPLACE FUNCTION public.has_active_entry_pass(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.entry_passes
    WHERE user_id = _user_id AND status = 'active' AND expires_at > now())
$$;

DROP POLICY IF EXISTS "Public can view teaser media" ON public.creator_media;
CREATE POLICY "Pass holders creators and admins view teaser media"
ON public.creator_media FOR SELECT TO authenticated
USING (
  bucket = 'teasers' AND (
    public.has_active_entry_pass(auth.uid())
    OR public.has_role(auth.uid(), 'creator'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);