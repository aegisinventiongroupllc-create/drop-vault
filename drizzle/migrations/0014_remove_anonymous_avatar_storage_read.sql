DROP POLICY IF EXISTS "Public can view profile avatars" ON storage.objects;

CREATE POLICY "Signed in users can view profile avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'profile-avatars');