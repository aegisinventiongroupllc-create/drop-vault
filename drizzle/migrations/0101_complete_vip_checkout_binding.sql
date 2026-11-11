ALTER TABLE public.vip_pass_checkouts ADD COLUMN invoice_started_at timestamptz;
ALTER TABLE public.vip_pass_payment_receipts ADD COLUMN order_id text;
CREATE UNIQUE INDEX vip_receipt_order ON public.vip_pass_payment_receipts(order_id) WHERE order_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.reserve_vip_checkout(_creator uuid,_pass public.vip_pass_type) RETURNS public.vip_pass_checkouts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r public.vip_pass_checkouts; cap integer; sold integer; BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server authorization required' USING ERRCODE='42501'; END IF;
 IF _pass IS NULL OR _pass NOT IN ('PRO_PASS','ELITE_PASS') OR NOT public.has_role(_creator,'creator') OR EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=_creator) OR EXISTS(SELECT 1 FROM public.creator_consent_withdrawals WHERE creator_id=_creator) THEN RAISE EXCEPTION 'Eligible creator required' USING ERRCODE='42501'; END IF;
 SELECT total_passes_cap,passes_sold INTO cap,sold FROM public.vip_pass_inventory WHERE id=true FOR UPDATE;
 UPDATE public.vip_pass_checkouts SET status='released' WHERE status='reserved' AND payment_id IS NULL AND invoice_started_at IS NULL AND expires_at<=now();
 IF EXISTS(SELECT 1 FROM public.creator_split_settings WHERE creator_id=_creator AND vip_pass_purchased<>'NONE') THEN RAISE EXCEPTION 'Creator already owns a VIP pass'; END IF;
 SELECT * INTO r FROM public.vip_pass_checkouts WHERE creator_id=_creator AND status IN ('reserved','invoiced');
 IF r.id IS NOT NULL THEN IF r.pass_type<>_pass THEN RAISE EXCEPTION 'Finish your existing VIP checkout first'; END IF; RETURN r; END IF;
 IF cap IS NULL OR sold+(SELECT count(*) FROM public.vip_pass_checkouts WHERE status IN ('reserved','invoiced'))>=LEAST(cap,1000) THEN RAISE EXCEPTION 'VIP passes sold out'; END IF;
 INSERT INTO public.vip_pass_checkouts(creator_id,pass_type,amount_usd) VALUES(_creator,_pass,CASE WHEN _pass='PRO_PASS' THEN 1500 ELSE 3500 END) RETURNING * INTO r; RETURN r;
 END $$;
CREATE FUNCTION public.claim_vip_invoice(_checkout uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server authorization required' USING ERRCODE='42501'; END IF;
 UPDATE public.vip_pass_checkouts SET invoice_started_at=now() WHERE id=_checkout AND status='reserved' AND invoice_started_at IS NULL AND expires_at>now(); RETURN FOUND;
 END $$;
CREATE FUNCTION public.attach_vip_invoice(_checkout uuid,_payment text,_url text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r public.vip_pass_checkouts; BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server authorization required' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.vip_pass_checkouts WHERE id=_checkout FOR UPDATE;
 IF r.id IS NULL OR r.status<>'reserved' OR r.invoice_started_at IS NULL OR _payment IS NULL OR _payment='' OR _url IS NULL OR _url NOT LIKE 'https://%' THEN RAISE EXCEPTION 'Invalid VIP invoice'; END IF;
 INSERT INTO public.vip_pass_payment_receipts(payment_id,order_id,creator_id,pass_type,amount_usd,currency) VALUES(_payment,'dttvip-'||r.id,r.creator_id,r.pass_type,r.amount_usd,'USD');
 UPDATE public.vip_pass_checkouts SET status='invoiced',payment_id=_payment,invoice_url=_url,expires_at=now()+interval '2 hours' WHERE id=_checkout;
 END $$;
CREATE FUNCTION public.release_vip_checkout(_checkout uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server authorization required' USING ERRCODE='42501'; END IF;
 PERFORM id FROM public.vip_pass_inventory WHERE id=true FOR UPDATE;
 UPDATE public.vip_pass_checkouts SET status='released' WHERE id=_checkout AND status IN ('reserved','invoiced') AND NOT EXISTS(SELECT 1 FROM public.vip_pass_payment_receipts r WHERE r.payment_id=vip_pass_checkouts.payment_id AND r.verified_at IS NOT NULL);
 END $$;
REVOKE ALL ON FUNCTION public.claim_vip_invoice(uuid),public.attach_vip_invoice(uuid,text,text),public.release_vip_checkout(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_vip_invoice(uuid),public.attach_vip_invoice(uuid,text,text),public.release_vip_checkout(uuid) TO service_role;