ALTER TABLE public.founding_creators ALTER COLUMN split_creator SET DEFAULT 91, ALTER COLUMN split_platform SET DEFAULT 9;

CREATE OR REPLACE FUNCTION public.claim_founding_slot(_creator_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c text; _s text; _n int;
BEGIN
  SELECT upper(country), CASE WHEN vault_side = 'men' THEN 'men' ELSE 'women' END INTO _c, _s
  FROM profiles WHERE user_id = _creator_id AND role = 'creator' AND verification_status = 'approved';
  IF _c IS NULL OR _c = 'GLOBAL' OR length(_c) <> 2 THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM founding_creators WHERE creator_id = _creator_id) THEN RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('founding:' || _c || ':' || _s));
  SELECT count(*) INTO _n FROM founding_creators WHERE country = _c AND vault_side = _s;
  IF _n >= 5 THEN RETURN; END IF;
  INSERT INTO founding_creators (creator_id, country, vault_side, slot, split_creator, split_platform)
  VALUES (_creator_id, _c, _s, _n + 1, 91, 9)
  ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.claim_founding_slot(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_founding_creators_public()
RETURNS TABLE(country text, vault_side text, slot integer, display_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.country, f.vault_side, f.slot, p.display_name
  FROM public.founding_creators f
  JOIN public.profiles p ON p.user_id = f.creator_id AND p.role = 'creator'
  WHERE f.slot <= 5
  ORDER BY f.country, f.vault_side, f.slot
$$;
REVOKE ALL ON FUNCTION public.get_founding_creators_public() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_founding_creators_public() TO authenticated;