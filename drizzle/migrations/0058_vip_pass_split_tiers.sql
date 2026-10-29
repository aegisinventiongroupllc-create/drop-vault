CREATE TYPE public.creator_split_tier AS ENUM ('STANDARD','FOUNDER','PRO_VIP','ELITE_VIP','MILESTONE_100K');
CREATE TYPE public.vip_pass_type AS ENUM ('NONE','PRO_PASS','ELITE_PASS');

CREATE TABLE public.creator_split_settings (
  creator_id uuid PRIMARY KEY,
  creator_split_tier public.creator_split_tier NOT NULL DEFAULT 'STANDARD',
  custom_vault_split numeric(4,2) NOT NULL DEFAULT 0.90,
  custom_request_split numeric(4,2) NOT NULL DEFAULT 0.85,
  power_week_active boolean NOT NULL DEFAULT false,
  power_week_expires_at timestamptz,
  vip_pass_purchased public.vip_pass_type NOT NULL DEFAULT 'NONE',
  vip_pass_purchased_at timestamptz,
  vip_badge boolean NOT NULL DEFAULT false,
  priority_placement_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.creator_split_settings TO authenticated;
GRANT ALL ON public.creator_split_settings TO service_role;
ALTER TABLE public.creator_split_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators read own split" ON public.creator_split_settings FOR SELECT TO authenticated
  USING (creator_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.vip_pass_inventory (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  total_passes_cap integer NOT NULL DEFAULT 1000,
  passes_sold integer NOT NULL DEFAULT 0 CHECK (passes_sold >= 0 AND passes_sold <= total_passes_cap),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vip_pass_inventory TO anon, authenticated;
GRANT ALL ON public.vip_pass_inventory TO service_role;
ALTER TABLE public.vip_pass_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads pass inventory" ON public.vip_pass_inventory FOR SELECT USING (true);
INSERT INTO public.vip_pass_inventory (id) VALUES (true) ON CONFLICT DO NOTHING;

-- Unlock split: best of standard 90, active founding 92, Pro 92, Elite 93, active Power Week 92.
CREATE OR REPLACE FUNCTION public.creator_split_percent(_creator_id uuid)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT GREATEST(
    90,
    COALESCE((SELECT f.split_creator FROM public.founding_creators f WHERE f.creator_id=_creator_id AND f.ends_at>now()),0),
    COALESCE((SELECT CASE s.vip_pass_purchased WHEN 'ELITE_PASS' THEN 93 WHEN 'PRO_PASS' THEN 92 ELSE 0 END
              FROM public.creator_split_settings s WHERE s.creator_id=_creator_id),0),
    CASE WHEN EXISTS (SELECT 1 FROM public.power_weeks w WHERE w.creator_id=_creator_id AND w.active
         AND w.started_at<=now() AND w.ends_at>now()) THEN 92 ELSE 0 END)
$$;

CREATE OR REPLACE FUNCTION public.creator_request_split_percent(_creator_id uuid)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE WHEN EXISTS (SELECT 1 FROM public.creator_split_settings
    WHERE creator_id=_creator_id AND vip_pass_purchased='ELITE_PASS') THEN 90 ELSE 85 END
$$;

-- 100k milestone: 7-day 92/8 Power Week, only for creators without a VIP pass (pass holders already exceed it).
CREATE OR REPLACE FUNCTION public.maybe_start_power_week()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _count bigint; _milestone int;
BEGIN
  IF EXISTS (SELECT 1 FROM public.creator_split_settings WHERE creator_id=NEW.creator_id AND vip_pass_purchased<>'NONE') THEN RETURN NEW; END IF;
  SELECT count(*) INTO _count FROM public.creator_hearts WHERE creator_id = NEW.creator_id;
  _milestone := (floor(_count / 100000) * 100000)::int;
  IF _milestone >= 100000 AND NOT EXISTS (
    SELECT 1 FROM public.power_weeks WHERE creator_id = NEW.creator_id AND milestone_followers >= _milestone) THEN
    INSERT INTO public.power_weeks (creator_id, milestone_followers, started_at, ends_at, split_creator, split_platform, active)
    VALUES (NEW.creator_id, _milestone, now(), now() + interval '7 days', 92, 8, true);
  END IF;
  RETURN NEW;
END $$;