DROP POLICY IF EXISTS "Signed in users view creator profile photos" ON public.creator_profile_photos;
CREATE POLICY "View own or active creator profile photos" ON public.creator_profile_photos
FOR SELECT TO authenticated
USING (creator_id = (SELECT auth.uid()) OR is_active = true);

DROP POLICY IF EXISTS "Signed in users view registered creator profile photos" ON storage.objects;
CREATE POLICY "View own or active creator profile photo files" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'creator-profile-photos' AND (
    owner_id = (SELECT auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.creator_profile_photos cpp
               WHERE cpp.storage_path = objects.name AND cpp.is_active = true)
  )
);