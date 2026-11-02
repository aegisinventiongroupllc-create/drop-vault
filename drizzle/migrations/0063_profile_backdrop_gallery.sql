CREATE TABLE public.profile_backdrop_settings (user_id uuid PRIMARY KEY, design_id text, upload_path text, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.profile_backdrop_settings TO authenticated;
GRANT ALL ON public.profile_backdrop_settings TO service_role;
ALTER TABLE public.profile_backdrop_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own or eligible creator backdrop" ON public.profile_backdrop_settings FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR (public.has_role(user_id,'creator') AND (public.has_active_entry_pass(auth.uid()) OR public.has_role(auth.uid(),'creator'))));
CREATE OR REPLACE FUNCTION public.set_my_profile_backdrop(_design text DEFAULT NULL, _path text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid();
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF _design IS NOT NULL AND _design NOT IN ('beach','gaming','cars','spring','summer','autumn','winter','satin','cluster','deepfield','milkyway','blueMeteor','crescent','cosmicGold','violetWorld','celestialStorm','goldenMoon') THEN RAISE EXCEPTION 'Unknown design'; END IF;
 IF _path IS NOT NULL THEN
  IF _design IS NOT NULL OR split_part(_path,'/',1)<>u::text OR _path !~ '^[0-9a-f-]{36}/backdrop-[0-9a-f-]{36}\.jpg$' THEN RAISE EXCEPTION 'Invalid owned image'; END IF;
  IF public.has_role(u,'creator') AND NOT public.can_upload_creator_media(u) THEN RAISE EXCEPTION 'Creator identity approval required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='profile-backdrops' AND name=_path AND owner_id=u::text AND metadata->>'mimetype'='image/jpeg' AND (metadata->>'size')::bigint BETWEEN 1 AND 5242880) THEN RAISE EXCEPTION 'Upload a valid owned JPEG first'; END IF;
 END IF;
 INSERT INTO public.profile_backdrop_settings(user_id,design_id,upload_path) VALUES(u,_design,_path) ON CONFLICT(user_id) DO UPDATE SET design_id=EXCLUDED.design_id,upload_path=EXCLUDED.upload_path,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.set_my_profile_backdrop(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_my_profile_backdrop(text,text) TO authenticated;
CREATE POLICY "Owner backdrop uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='profile-backdrops' AND (storage.foldername(name))[1]=auth.uid()::text AND name ~ '^[0-9a-f-]{36}/backdrop-[0-9a-f-]{36}\.jpg$' AND (NOT public.has_role(auth.uid(),'creator') OR public.can_upload_creator_media(auth.uid())));
CREATE POLICY "Private or selected creator backdrop reads" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='profile-backdrops' AND ((storage.foldername(name))[1]=auth.uid()::text OR public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.profile_backdrop_settings b WHERE b.upload_path=name AND public.has_role(b.user_id,'creator') AND (public.has_active_entry_pass(auth.uid()) OR public.has_role(auth.uid(),'creator')))));
CREATE POLICY "Owner backdrop cleanup" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='profile-backdrops' AND owner_id=auth.uid()::text AND (storage.foldername(name))[1]=auth.uid()::text);