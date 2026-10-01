ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_config_clothing
  CHECK (
    NOT (avatar_config ? 'clothing')
    OR avatar_config->>'clothing' IN ('hoodie', 'crewneck', 'jacket', 'tshirt')
  ) NOT VALID;