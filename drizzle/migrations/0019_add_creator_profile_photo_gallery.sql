CREATE TABLE public.creator_profile_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_profile_photos_owned_path CHECK (
    storage_path LIKE creator_id::text || '/%'
    AND storage_path NOT LIKE '%..%'
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_profile_photos TO authenticated;
GRANT ALL ON public.creator_profile_photos TO service_role;

ALTER TABLE public.creator_profile_photos ENABLE ROW LEVEL SECURITY;

CREATE INDEX creator_profile_photos_creator_created_idx
ON public.creator_profile_photos (creator_id, created_at DESC);

CREATE UNIQUE INDEX creator_profile_photos_one_active_idx
ON public.creator_profile_photos (creator_id)
WHERE is_active;

CREATE POLICY "Signed in users view creator profile photos"
ON public.creator_profile_photos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Creators insert own profile photos"
ON public.creator_profile_photos
FOR INSERT
TO authenticated
WITH CHECK (
  creator_id = (SELECT auth.uid())
  AND public.has_role((SELECT auth.uid()), 'creator'::public.app_role)
  AND storage_path LIKE (SELECT auth.uid())::text || '/%'
  AND storage_path NOT LIKE '%..%'
);

CREATE POLICY "Creators update own profile photos"
ON public.creator_profile_photos
FOR UPDATE
TO authenticated
USING (
  creator_id = (SELECT auth.uid())
  AND public.has_role((SELECT auth.uid()), 'creator'::public.app_role)
)
WITH CHECK (
  creator_id = (SELECT auth.uid())
  AND public.has_role((SELECT auth.uid()), 'creator'::public.app_role)
  AND storage_path LIKE (SELECT auth.uid())::text || '/%'
  AND storage_path NOT LIKE '%..%'
);

CREATE POLICY "Creators delete own profile photos"
ON public.creator_profile_photos
FOR DELETE
TO authenticated
USING (
  creator_id = (SELECT auth.uid())
  AND public.has_role((SELECT auth.uid()), 'creator'::public.app_role)
);

CREATE POLICY "Creators upload own public profile photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'creator-profile-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  AND public.has_role((SELECT auth.uid()), 'creator'::public.app_role)
);

CREATE POLICY "Signed in users view registered creator profile photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'creator-profile-photos'
  AND EXISTS (
    SELECT 1
    FROM public.creator_profile_photos cpp
    WHERE cpp.storage_path = name
  )
);

CREATE POLICY "Creators update own public profile photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'creator-profile-photos'
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  AND public.has_role((SELECT auth.uid()), 'creator'::public.app_role)
)
WITH CHECK (
  bucket_id = 'creator-profile-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  AND public.has_role((SELECT auth.uid()), 'creator'::public.app_role)
);

CREATE POLICY "Creators delete own public profile photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'creator-profile-photos'
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  AND public.has_role((SELECT auth.uid()), 'creator'::public.app_role)
);

CREATE OR REPLACE FUNCTION public.set_active_creator_profile_photo(_photo_id uuid)
RETURNS public.creator_profile_photos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _selected public.creator_profile_photos;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'creator'::public.app_role) THEN
    RAISE EXCEPTION 'Creator account required';
  END IF;

  SELECT * INTO _selected
  FROM public.creator_profile_photos
  WHERE id = _photo_id AND creator_id = _uid;

  IF _selected.id IS NULL THEN
    RAISE EXCEPTION 'Profile photo not found';
  END IF;

  UPDATE public.creator_profile_photos
  SET is_active = false, updated_at = now()
  WHERE creator_id = _uid AND is_active;

  UPDATE public.creator_profile_photos
  SET is_active = true, updated_at = now()
  WHERE id = _photo_id
  RETURNING * INTO _selected;

  RETURN _selected;
END;
$$;

REVOKE ALL ON FUNCTION public.set_active_creator_profile_photo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_active_creator_profile_photo(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_updated_at_creator_profile_photos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_updated_at_creator_profile_photos() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER creator_profile_photos_updated_at
BEFORE UPDATE ON public.creator_profile_photos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_creator_profile_photos();

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false)
AS
SELECT
  p.user_id,
  p.display_name,
  p.country,
  p.vault_side,
  p.role,
  p.created_at,
  p.avatar_config,
  (
    SELECT cpp.storage_path
    FROM public.creator_profile_photos cpp
    WHERE cpp.creator_id = p.user_id AND cpp.is_active
    LIMIT 1
  ) AS profile_photo_path
FROM public.profiles p;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT ALL ON public.public_profiles TO service_role;

COMMENT ON VIEW public.public_profiles IS 'Public social identity only: user id, unique handle, avatar configuration, selected creator photo path, country, vault side, role, and creation date. Email and legal identity fields are excluded.';