ALTER TABLE public.profiles
  ALTER COLUMN avatar_config SET DEFAULT '{"face":"spark","tone":"rose","accent":"star","skinTone":"medium","hair":"waves","hairColor":"dark","facialHair":"none","glasses":"none","eyebrows":"soft","ears":"medium","jawline":"oval"}'::jsonb;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_config_layers
  CHECK (
    avatar_config->>'skinTone' IN ('light', 'warm', 'medium', 'deep', 'rich', 'dark')
    AND avatar_config->>'hair' IN ('none', 'crop', 'waves', 'curls', 'long', 'mohawk')
    AND avatar_config->>'hairColor' IN ('dark', 'brown', 'blonde', 'red', 'silver', 'neon')
    AND avatar_config->>'facialHair' IN ('none', 'stubble', 'mustache', 'goatee', 'beard')
    AND avatar_config->>'glasses' IN ('none', 'round', 'square', 'aviator')
    AND avatar_config->>'eyebrows' IN ('soft', 'straight', 'arched', 'bold', 'split')
    AND avatar_config->>'ears' IN ('small', 'medium', 'large', 'pointed')
    AND avatar_config->>'jawline' IN ('oval', 'heart', 'soft', 'square', 'strong', 'tapered')
  ) NOT VALID;