DROP POLICY IF EXISTS "Signed in users can view profile avatars" ON storage.objects;

CREATE POLICY "Users can view own profile avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);