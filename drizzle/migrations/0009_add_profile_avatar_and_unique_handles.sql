ALTER TABLE public.profiles
  ADD COLUMN avatar_config jsonb NOT NULL DEFAULT '{"face":"spark","tone":"rose","accent":"star"}'::jsonb;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_format
  CHECK (
    display_name IS NULL OR
    display_name ~ '^[A-Za-z0-9_][A-Za-z0-9_.]{2,23}$'
  ) NOT VALID;

CREATE UNIQUE INDEX profiles_display_name_unique_ci
  ON public.profiles (lower(display_name))
  WHERE display_name IS NOT NULL AND btrim(display_name) <> '';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_config_shape
  CHECK (
    jsonb_typeof(avatar_config) = 'object'
    AND avatar_config ? 'face'
    AND avatar_config ? 'tone'
    AND avatar_config ? 'accent'
    AND avatar_config->>'face' IN ('spark', 'rogue', 'nova', 'pixel', 'orbit', 'crown')
    AND avatar_config->>'tone' IN ('rose', 'cyan', 'gold', 'lime', 'violet', 'silver')
    AND avatar_config->>'accent' IN ('star', 'bolt', 'moon', 'flame', 'heart', 'diamond')
  );

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT
  user_id,
  display_name,
  country,
  vault_side,
  role,
  created_at,
  avatar_config
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT ALL ON public.public_profiles TO service_role;