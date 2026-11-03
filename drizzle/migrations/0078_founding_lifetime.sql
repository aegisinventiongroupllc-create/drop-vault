ALTER TABLE public.founding_creators ALTER COLUMN ends_at SET DEFAULT '9999-12-31 00:00:00+00';
UPDATE public.founding_creators SET ends_at = '9999-12-31 00:00:00+00';
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
  INSERT INTO founding_creators (creator_id, country, vault_side, slot, split_creator, split_platform, ends_at)
  VALUES (_creator_id, _c, _s, _n + 1, 91, 9, '9999-12-31 00:00:00+00')
  ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.claim_founding_slot(uuid) FROM PUBLIC, anon, authenticated;