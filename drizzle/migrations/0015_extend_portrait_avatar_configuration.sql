ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_config_portrait_fields
  CHECK (
    (NOT (avatar_config ? 'eyeSpacing') OR avatar_config->>'eyeSpacing' IN ('close', 'balanced', 'wide'))
    AND (NOT (avatar_config ? 'noseShape') OR avatar_config->>'noseShape' IN ('narrow', 'balanced', 'broad'))
    AND (NOT (avatar_config ? 'portraitPath') OR jsonb_typeof(avatar_config->'portraitPath') = 'string')
  ) NOT VALID;