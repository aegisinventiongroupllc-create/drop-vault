CREATE OR REPLACE FUNCTION public.apply_verified_vip_pass(_payment_id text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r public.vip_pass_payment_receipts; c public.vip_pass_checkouts; sold integer; cap integer; BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server authorization required' USING ERRCODE='42501'; END IF;
 SELECT passes_sold,total_passes_cap INTO sold,cap FROM public.vip_pass_inventory WHERE id=true FOR UPDATE;
 SELECT * INTO r FROM public.vip_pass_payment_receipts WHERE payment_id=_payment_id FOR UPDATE;
 IF r.payment_id IS NULL OR r.verified_at IS NULL OR NOT public.has_role(r.creator_id,'creator') OR EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=r.creator_id) OR EXISTS(SELECT 1 FROM public.creator_consent_withdrawals WHERE creator_id=r.creator_id) THEN RAISE EXCEPTION 'Verified eligible creator payment required' USING ERRCODE='42501'; END IF;
 IF r.applied_at IS NOT NULL THEN RETURN false; END IF;
 IF sold IS NULL OR sold>=LEAST(cap,1000) THEN RAISE EXCEPTION 'VIP passes sold out' USING ERRCODE='22023'; END IF;
 SELECT * INTO c FROM public.vip_pass_checkouts WHERE payment_id=r.payment_id FOR UPDATE;
 IF c.id IS NULL OR c.status<>'invoiced' OR c.creator_id<>r.creator_id OR c.pass_type<>r.pass_type OR c.amount_usd<>r.amount_usd OR r.order_id IS DISTINCT FROM 'dttvip-'||c.id THEN RAISE EXCEPTION 'Matching reserved VIP checkout required' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM public.creator_split_settings WHERE creator_id=r.creator_id AND vip_pass_purchased<>'NONE') THEN RAISE EXCEPTION 'Creator already owns a VIP pass' USING ERRCODE='22023'; END IF;
 INSERT INTO public.creator_split_settings(creator_id,creator_split_tier,custom_vault_split,custom_request_split,vip_pass_purchased,vip_pass_purchased_at,vip_badge,priority_placement_until) VALUES(r.creator_id,CASE WHEN r.pass_type='ELITE_PASS' THEN 'ELITE_VIP'::public.creator_split_tier ELSE 'PRO_VIP'::public.creator_split_tier END,0.92,CASE WHEN r.pass_type='ELITE_PASS' THEN 0.90 ELSE 0.85 END,r.pass_type,now(),r.pass_type='ELITE_PASS',CASE WHEN r.pass_type='ELITE_PASS' THEN now()+interval '30 days' ELSE NULL END)
 ON CONFLICT(creator_id) DO UPDATE SET creator_split_tier=EXCLUDED.creator_split_tier,custom_vault_split=0.92,custom_request_split=EXCLUDED.custom_request_split,vip_pass_purchased=EXCLUDED.vip_pass_purchased,vip_pass_purchased_at=EXCLUDED.vip_pass_purchased_at,vip_badge=EXCLUDED.vip_badge,priority_placement_until=EXCLUDED.priority_placement_until,updated_at=now();
 UPDATE public.vip_pass_inventory SET passes_sold=passes_sold+1,updated_at=now() WHERE id=true;
 UPDATE public.vip_pass_payment_receipts SET applied_at=now() WHERE payment_id=_payment_id;
 UPDATE public.vip_pass_checkouts SET status='completed' WHERE id=c.id; RETURN true;
 END $$;
CREATE FUNCTION public.get_my_vip_store() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE cap integer; sold integer; held integer; c public.vip_pass_checkouts; BEGIN
 IF NOT public.has_role(auth.uid(),'creator') OR EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=auth.uid()) OR EXISTS(SELECT 1 FROM public.creator_consent_withdrawals WHERE creator_id=auth.uid()) THEN RAISE EXCEPTION 'Eligible creator required' USING ERRCODE='42501'; END IF;
 SELECT LEAST(total_passes_cap,1000),passes_sold INTO cap,sold FROM public.vip_pass_inventory WHERE id=true;
 SELECT count(*) INTO held FROM public.vip_pass_checkouts WHERE status='invoiced' OR (status='reserved' AND (invoice_started_at IS NOT NULL OR expires_at>now()));
 SELECT * INTO c FROM public.vip_pass_checkouts WHERE creator_id=auth.uid() AND (status='invoiced' OR (status='reserved' AND (invoice_started_at IS NOT NULL OR expires_at>now()))) ORDER BY created_at DESC LIMIT 1;
 RETURN jsonb_build_object('cap',cap,'sold',sold,'remaining',GREATEST(0,cap-sold-held),'owned',COALESCE((SELECT vip_pass_purchased FROM public.creator_split_settings WHERE creator_id=auth.uid()),'NONE'),'checkout',CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object('id',c.id,'pass_type',c.pass_type,'status',c.status,'invoice_url',c.invoice_url,'expires_at',c.expires_at) END);
 END $$;
REVOKE ALL ON FUNCTION public.get_my_vip_store() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_vip_store() TO authenticated;
REVOKE ALL ON FUNCTION public.apply_verified_vip_pass(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_verified_vip_pass(text) TO service_role;