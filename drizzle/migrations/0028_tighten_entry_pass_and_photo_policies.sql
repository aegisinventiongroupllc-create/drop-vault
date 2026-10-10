DROP POLICY IF EXISTS "Service role inserts entry passes" ON public.entry_passes;
REVOKE INSERT, UPDATE, DELETE ON public.entry_passes FROM anon, authenticated;
GRANT SELECT ON public.entry_passes TO authenticated;
GRANT ALL ON public.entry_passes TO service_role;

DROP POLICY IF EXISTS "View own or active creator profile photo files" ON storage.objects;
CREATE POLICY "View own or active creator profile photo files" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'creator-profile-photos' AND (
    owner_id = (SELECT auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.creator_profile_photos cpp
      WHERE cpp.storage_path = objects.name
        AND cpp.is_active = true
        AND cpp.creator_id::text = (storage.foldername(objects.name))[1]
    )
  )
);