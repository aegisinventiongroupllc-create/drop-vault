CREATE TABLE public.founding_creators (
  creator_id uuid PRIMARY KEY,
  country text NOT NULL,
  vault_side text NOT NULL CHECK (vault_side IN ('women','men')),
  slot integer NOT NULL CHECK (slot BETWEEN 1 AND 10),
  locked_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT now() + interval '365 days',
  split_creator integer NOT NULL DEFAULT 92,
  split_platform integer NOT NULL DEFAULT 8,
  UNIQUE (country, vault_side, slot)
);
GRANT SELECT ON public.founding_creators TO authenticated;
GRANT ALL ON public.founding_creators TO service_role;
ALTER TABLE public.founding_creators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators see own founding slot" ON public.founding_creators FOR SELECT TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "Admins see founding slots" ON public.founding_creators FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

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
  IF _n >= 10 THEN RETURN; END IF;
  INSERT INTO founding_creators (creator_id, country, vault_side, slot) VALUES (_creator_id, _c, _s, _n + 1)
  ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.claim_founding_slot(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_founding_slot_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'creator' AND NEW.verification_status = 'approved' THEN
    PERFORM public.claim_founding_slot(NEW.user_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER claim_founding_slot_on_profile
AFTER INSERT OR UPDATE OF verification_status, role, country ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.claim_founding_slot_trigger();

-- Backfill already-approved creators in approval order.
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT user_id FROM profiles WHERE role = 'creator' AND verification_status = 'approved'
           ORDER BY COALESCE(verification_reviewed_at, created_at) LOOP
    PERFORM public.claim_founding_slot(r.user_id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.creator_split_percent(_creator_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT GREATEST(
    COALESCE((SELECT f.split_creator FROM public.founding_creators f
              WHERE f.creator_id = _creator_id AND f.ends_at > now()), 90),
    CASE WHEN EXISTS (SELECT 1 FROM public.power_weeks w
              WHERE w.creator_id = _creator_id AND w.active
                AND w.started_at <= now() AND w.ends_at > now())
         THEN 95 ELSE 0 END
  )
$function$;