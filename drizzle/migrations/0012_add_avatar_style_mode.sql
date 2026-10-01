ALTER TABLE public.profiles
  ALTER COLUMN avatar_config SET DEFAULT '{"face":"spark","tone":"rose","accent":"star","style":"woman","skinTone":"medium","hair":"waves","hairColor":"dark","facialHair":"none","glasses":"none","eyebrows":"soft","ears":"medium","jawline":"oval"}'::jsonb;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_config_style
  CHECK (avatar_config->>'style' IN ('woman', 'man')) NOT VALID;