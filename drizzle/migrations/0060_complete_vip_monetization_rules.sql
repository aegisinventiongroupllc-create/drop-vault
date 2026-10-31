ALTER TABLE public.creator_split_settings ADD CONSTRAINT permanent_vault_split_ceiling CHECK (custom_vault_split BETWEEN 0.90 AND 0.92) NOT VALID;
ALTER TABLE public.creator_split_settings ADD CONSTRAINT request_split_range CHECK (custom_request_split BETWEEN 0.85 AND 0.90) NOT VALID;
ALTER TABLE public.vip_pass_inventory ADD CONSTRAINT lifetime_vip_cap CHECK (total_passes_cap = 1000) NOT VALID;

CREATE OR REPLACE FUNCTION public.creator_split_percent(_creator_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM public.power_weeks w WHERE w.creator_id=_creator_id AND w.active AND w.started_at<=now() AND w.ends_at>now()) THEN 95
 ELSE LEAST(92,GREATEST(90,
 COALESCE((SELECT f.split_creator FROM public.founding_creators f WHERE f.creator_id=_creator_id AND f.ends_at>now()),90),
 COALESCE((SELECT CASE WHEN s.vip_pass_purchased<>'NONE' OR s.creator_split_tier='MILESTONE_100K' THEN 92 ELSE round(s.custom_vault_split*100)::integer END FROM public.creator_split_settings s WHERE s.creator_id=_creator_id),90))) END
$$;

CREATE OR REPLACE FUNCTION public.enforce_request_revenue_split()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pct integer;
BEGIN
 IF TG_OP='UPDATE' AND OLD.status IN ('paid','completed') THEN
  IF NEW.amount_usd IS DISTINCT FROM OLD.amount_usd OR NEW.creator_id IS DISTINCT FROM OLD.creator_id OR NEW.creator_share_usd IS DISTINCT FROM OLD.creator_share_usd OR NEW.platform_share_usd IS DISTINCT FROM OLD.platform_share_usd THEN
   RAISE EXCEPTION 'Paid request earnings are immutable' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
 END IF;
 IF TG_OP='INSERT' OR NEW.amount_usd IS DISTINCT FROM OLD.amount_usd OR NEW.creator_id IS DISTINCT FROM OLD.creator_id OR NEW.creator_share_usd IS DISTINCT FROM OLD.creator_share_usd OR NEW.platform_share_usd IS DISTINCT FROM OLD.platform_share_usd OR (NEW.status='paid' AND OLD.status<>'paid') THEN
  pct:=public.creator_request_split_percent(NEW.creator_id);
  NEW.creator_share_usd:=round(NEW.amount_usd*pct/100,2);
  NEW.platform_share_usd:=NEW.amount_usd-NEW.creator_share_usd+5;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER enforce_request_revenue BEFORE INSERT OR UPDATE ON public.custom_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_request_revenue_split();

CREATE OR REPLACE FUNCTION public.maybe_start_power_week()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n bigint; milestone integer;
BEGIN
 SELECT count(*) INTO n FROM public.creator_hearts h WHERE h.creator_id=NEW.creator_id AND public.has_role(h.user_id,'customer');
 milestone:=(floor(n/100000)*100000)::integer;
 IF milestone>=100000 AND NOT EXISTS(SELECT 1 FROM public.power_weeks WHERE creator_id=NEW.creator_id AND milestone_followers>=milestone) THEN
  INSERT INTO public.power_weeks(creator_id,milestone_followers,started_at,ends_at,split_creator,split_platform,active) VALUES(NEW.creator_id,milestone,now(),now()+interval '7 days',95,5,true);
  INSERT INTO public.creator_split_settings(creator_id,creator_split_tier,custom_vault_split,power_week_active,power_week_expires_at)
  VALUES(NEW.creator_id,'MILESTONE_100K',0.92,true,now()+interval '7 days')
  ON CONFLICT(creator_id) DO UPDATE SET custom_vault_split=0.92,power_week_active=true,power_week_expires_at=EXCLUDED.power_week_expires_at,
  creator_split_tier=CASE WHEN public.creator_split_settings.vip_pass_purchased='NONE' THEN 'MILESTONE_100K'::public.creator_split_tier ELSE public.creator_split_settings.creator_split_tier END,updated_at=now();
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_revenue_terms()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('vault_percent',public.creator_split_percent(auth.uid()),'request_percent',public.creator_request_split_percent(auth.uid()),
 'vip_pass',COALESCE((SELECT vip_pass_purchased::text FROM public.creator_split_settings WHERE creator_id=auth.uid()),'NONE'),
 'power_week_expires_at',(SELECT max(ends_at) FROM public.power_weeks WHERE creator_id=auth.uid() AND active AND started_at<=now() AND ends_at>now())) WHERE auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.get_my_revenue_terms() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_revenue_terms() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_creator_vip_status(_creator_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('vip_badge',COALESCE((SELECT vip_badge AND vip_pass_purchased='ELITE_PASS' FROM public.creator_split_settings WHERE creator_id=_creator_id),false),
 'priority_active',COALESCE((SELECT vip_pass_purchased='ELITE_PASS' AND priority_placement_until>now() FROM public.creator_split_settings WHERE creator_id=_creator_id),false))
$$;
REVOKE ALL ON FUNCTION public.get_creator_vip_status(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_creator_vip_status(uuid) TO authenticated;

CREATE TABLE public.vip_pass_payment_receipts (
 payment_id text PRIMARY KEY, creator_id uuid NOT NULL, pass_type public.vip_pass_type NOT NULL CHECK(pass_type<>'NONE'),
 amount_usd numeric NOT NULL CHECK ((pass_type='PRO_PASS' AND amount_usd=1500) OR (pass_type='ELITE_PASS' AND amount_usd=3500)),
 currency text NOT NULL DEFAULT 'USD' CHECK(currency='USD'), verified_at timestamptz, applied_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.vip_pass_payment_receipts TO service_role;
ALTER TABLE public.vip_pass_payment_receipts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.apply_verified_vip_pass(_payment_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.vip_pass_payment_receipts; sold integer; cap integer;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server authorization required' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.vip_pass_payment_receipts WHERE payment_id=_payment_id FOR UPDATE;
 IF r.payment_id IS NULL OR r.verified_at IS NULL OR NOT public.has_role(r.creator_id,'creator') THEN RAISE EXCEPTION 'Verified creator payment required' USING ERRCODE='42501'; END IF;
 IF r.applied_at IS NOT NULL THEN RETURN false; END IF;
 SELECT passes_sold,total_passes_cap INTO sold,cap FROM public.vip_pass_inventory WHERE id=true FOR UPDATE;
 IF sold IS NULL OR sold>=LEAST(cap,1000) THEN RAISE EXCEPTION 'VIP passes sold out' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.creator_split_settings WHERE creator_id=r.creator_id AND vip_pass_purchased<>'NONE') THEN RAISE EXCEPTION 'Creator already owns a VIP pass' USING ERRCODE='22023'; END IF;
 INSERT INTO public.creator_split_settings(creator_id,creator_split_tier,custom_vault_split,custom_request_split,vip_pass_purchased,vip_pass_purchased_at,vip_badge,priority_placement_until)
 VALUES(r.creator_id,CASE WHEN r.pass_type='ELITE_PASS' THEN 'ELITE_VIP'::public.creator_split_tier ELSE 'PRO_VIP'::public.creator_split_tier END,0.92,CASE WHEN r.pass_type='ELITE_PASS' THEN 0.90 ELSE 0.85 END,r.pass_type,now(),r.pass_type='ELITE_PASS',CASE WHEN r.pass_type='ELITE_PASS' THEN now()+interval '30 days' ELSE NULL END)
 ON CONFLICT(creator_id) DO UPDATE SET creator_split_tier=EXCLUDED.creator_split_tier,custom_vault_split=0.92,custom_request_split=EXCLUDED.custom_request_split,vip_pass_purchased=EXCLUDED.vip_pass_purchased,vip_pass_purchased_at=EXCLUDED.vip_pass_purchased_at,vip_badge=EXCLUDED.vip_badge,priority_placement_until=EXCLUDED.priority_placement_until,updated_at=now();
 UPDATE public.vip_pass_inventory SET passes_sold=passes_sold+1,updated_at=now() WHERE id=true;
 UPDATE public.vip_pass_payment_receipts SET applied_at=now() WHERE payment_id=_payment_id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.apply_verified_vip_pass(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_verified_vip_pass(text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_teaser_page(_vault text,_country text DEFAULT NULL,_query text DEFAULT '',_offset integer DEFAULT 0)
RETURNS SETOF public.creator_media LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT m.* FROM public.get_active_teasers() m JOIN public.public_profiles p ON p.user_id=m.creator_id
 LEFT JOIN public.creator_heart_totals h ON h.creator_id=m.creator_id
 WHERE p.vault_side=_vault AND (_country IS NULL OR _country='GLOBAL' OR p.country=_country)
 AND (COALESCE(_query,'')='' OR p.display_name ILIKE '%'||left(_query,100)||'%' OR m.title ILIKE '%'||left(_query,100)||'%' OR EXISTS(SELECT 1 FROM unnest(p.tags) t WHERE t ILIKE '%'||left(_query,100)||'%'))
 ORDER BY (public.get_creator_vip_status(m.creator_id)->>'priority_active')::boolean DESC,COALESCE(h.hearts,0) DESC,m.creator_id LIMIT 24 OFFSET GREATEST(0,_offset)
$$;
CREATE OR REPLACE FUNCTION public.search_creator_page(_query text,_vault text DEFAULT NULL,_countries text[] DEFAULT '{}',_offset integer DEFAULT 0)
RETURNS SETOF public.public_profiles LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT p.* FROM public.public_profiles p WHERE p.role='creator' AND (_vault IS NULL OR p.vault_side=_vault)
 AND (p.display_name ILIKE '%'||left(_query,100)||'%' OR p.country=ANY(_countries) OR EXISTS(SELECT 1 FROM unnest(p.tags) t WHERE t ILIKE '%'||left(_query,100)||'%'))
 ORDER BY (public.get_creator_vip_status(p.user_id)->>'priority_active')::boolean DESC,p.user_id LIMIT 25 OFFSET GREATEST(0,_offset)
$$;

CREATE OR REPLACE FUNCTION public.allocate_token_checkout_fees()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.status='finished' AND NEW.tokens_credited BETWEEN 1 AND 100 AND NEW.amount_usd=NEW.tokens_credited*25 THEN NEW.platform_fee_collected:=NEW.tokens_credited; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER allocate_token_checkout_fees BEFORE INSERT ON public.token_purchases FOR EACH ROW EXECUTE FUNCTION public.allocate_token_checkout_fees();