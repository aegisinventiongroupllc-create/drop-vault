CREATE OR REPLACE FUNCTION public.creator_split_percent(_creator_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT CASE
  WHEN EXISTS(SELECT 1 FROM public.creator_split_settings s WHERE s.creator_id=_creator_id AND s.vip_pass_purchased='ELITE_PASS') THEN 93
  WHEN EXISTS(SELECT 1 FROM public.creator_split_settings s WHERE s.creator_id=_creator_id AND s.vip_pass_purchased='PRO_PASS') THEN 92
  WHEN EXISTS(SELECT 1 FROM public.power_weeks w WHERE w.creator_id=_creator_id AND w.active AND w.started_at<=now() AND w.ends_at>now()) THEN 92
  ELSE GREATEST(90, COALESCE((SELECT LEAST(92,f.split_creator) FROM public.founding_creators f WHERE f.creator_id=_creator_id AND f.ends_at>now()),90))
 END
$$;

CREATE OR REPLACE FUNCTION public.maybe_start_power_week() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n bigint; milestone integer;
BEGIN
 IF EXISTS(SELECT 1 FROM public.creator_split_settings WHERE creator_id=NEW.creator_id AND vip_pass_purchased<>'NONE') THEN RETURN NEW; END IF;
 n:=NEW.followers; milestone:=(floor(n/100000)*100000)::integer;
 IF milestone>=100000 AND NOT EXISTS(SELECT 1 FROM public.power_weeks WHERE creator_id=NEW.creator_id AND milestone_followers>=milestone) THEN
  INSERT INTO public.power_weeks(creator_id,milestone_followers,started_at,ends_at,split_creator,split_platform,active) VALUES(NEW.creator_id,milestone,now(),now()+interval '7 days',92,8,true);
  INSERT INTO public.creator_split_settings(creator_id,power_week_active,power_week_expires_at) VALUES(NEW.creator_id,true,now()+interval '7 days')
  ON CONFLICT(creator_id) DO UPDATE SET power_week_active=true,power_week_expires_at=EXCLUDED.power_week_expires_at,updated_at=now();
 END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.maybe_start_power_week() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_my_revenue_terms()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('vault_percent',public.creator_split_percent(auth.uid()),'request_percent',public.creator_request_split_percent(auth.uid()),
 'vip_pass',COALESCE((SELECT vip_pass_purchased::text FROM public.creator_split_settings WHERE creator_id=auth.uid()),'NONE'),
 'power_week_expires_at',CASE WHEN EXISTS(SELECT 1 FROM public.creator_split_settings WHERE creator_id=auth.uid() AND vip_pass_purchased<>'NONE') THEN NULL
   ELSE (SELECT max(ends_at) FROM public.power_weeks WHERE creator_id=auth.uid() AND active AND started_at<=now() AND ends_at>now()) END) WHERE auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.get_my_revenue_terms() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_revenue_terms() TO authenticated;