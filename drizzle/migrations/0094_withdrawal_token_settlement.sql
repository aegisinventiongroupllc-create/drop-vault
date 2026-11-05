ALTER TABLE public.token_balances ADD COLUMN IF NOT EXISTS bit_cents integer NOT NULL DEFAULT 0 CHECK (bit_cents >= 0);

CREATE TABLE public.withdrawal_customer_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id uuid NOT NULL REFERENCES public.creator_consent_withdrawals(id),
  creator_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('vault_pass','buyout')),
  source_id uuid NOT NULL,
  days_remaining integer NOT NULL,
  bit_cents integer NOT NULL CHECK (bit_cents >= 0),
  creator_clawback_usd numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);
GRANT SELECT ON public.withdrawal_customer_credits TO authenticated;
GRANT ALL ON public.withdrawal_customer_credits TO service_role;
ALTER TABLE public.withdrawal_customer_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers read own withdrawal credits" ON public.withdrawal_customer_credits FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.creator_withdrawal_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id uuid NOT NULL REFERENCES public.creator_consent_withdrawals(id),
  creator_id uuid NOT NULL,
  pending_before numeric(12,2) NOT NULL,
  clawback_usd numeric(12,2) NOT NULL,
  deducted_usd numeric(12,2) NOT NULL,
  platform_covered_usd numeric(12,2) NOT NULL,
  final_net_usd numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.creator_withdrawal_settlements TO authenticated;
GRANT ALL ON public.creator_withdrawal_settlements TO service_role;
ALTER TABLE public.creator_withdrawal_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators read own withdrawal settlement" ON public.creator_withdrawal_settlements FOR SELECT TO authenticated
  USING (creator_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- No cash/card refunds: ended access is returned only as Bit-cents (100 = 1 token, $20 value).
CREATE OR REPLACE FUNCTION public.settle_creator_withdrawal(_withdrawal uuid, _creator uuid) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; d integer; cents integer; claw numeric; cut numeric; total numeric := 0; pend numeric; ded numeric;
BEGIN
 cut := round(20 * COALESCE(public.creator_split_percent(_creator),90) / 100.0, 2);
 FOR s IN SELECT id, customer_id, expires_at FROM public.subscriptions
   WHERE creator_id=_creator AND status='active' AND expires_at > now() FOR UPDATE LOOP
   d := ceil(extract(epoch FROM (s.expires_at - now())) / 86400.0)::int;
   cents := round(d * 100 / 14.0)::int;
   claw := round(d * cut / 14.0, 2);
   INSERT INTO public.withdrawal_customer_credits(withdrawal_id,creator_id,customer_id,source,source_id,days_remaining,bit_cents,creator_clawback_usd)
   VALUES (_withdrawal,_creator,s.customer_id,'vault_pass',s.id,d,cents,claw) ON CONFLICT (source,source_id) DO NOTHING;
   IF FOUND THEN
     INSERT INTO public.token_balances(user_id,balance,bit_cents,updated_at) VALUES (s.customer_id,0,cents,now())
     ON CONFLICT (user_id) DO UPDATE SET bit_cents = public.token_balances.bit_cents + cents, updated_at = now();
     total := total + claw;
   END IF;
   UPDATE public.subscriptions SET status='expired', expires_at=now(), autorenew=false, updated_at=now() WHERE id=s.id;
 END LOOP;
 FOR s IN SELECT l.id, l.customer_id, t.creator_share_usd FROM public.user_permanent_library l
   JOIN public.transactions t ON t.id=l.transaction_id
   WHERE l.creator_id=_creator AND l.purchased_at > now() - interval '14 days' LOOP
   INSERT INTO public.withdrawal_customer_credits(withdrawal_id,creator_id,customer_id,source,source_id,days_remaining,bit_cents,creator_clawback_usd)
   VALUES (_withdrawal,_creator,s.customer_id,'buyout',s.id,14,100,s.creator_share_usd) ON CONFLICT (source,source_id) DO NOTHING;
   IF FOUND THEN
     INSERT INTO public.token_balances(user_id,balance,bit_cents,updated_at) VALUES (s.customer_id,0,100,now())
     ON CONFLICT (user_id) DO UPDATE SET bit_cents = public.token_balances.bit_cents + 100, updated_at = now();
     total := total + s.creator_share_usd;
   END IF;
 END LOOP;
 SELECT pending_balance INTO pend FROM public.creator_wallets WHERE user_id=_creator FOR UPDATE;
 pend := COALESCE(pend,0);
 ded := least(pend, total);
 UPDATE public.creator_wallets SET pending_balance = pending_balance - ded, updated_at=now() WHERE user_id=_creator;
 INSERT INTO public.creator_withdrawal_settlements(withdrawal_id,creator_id,pending_before,clawback_usd,deducted_usd,platform_covered_usd,final_net_usd)
 VALUES (_withdrawal,_creator,pend,total,ded,total-ded,pend-ded);
 RETURN pend-ded;
END $$;
REVOKE ALL ON FUNCTION public.settle_creator_withdrawal(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_creator_withdrawal(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.record_creator_withdrawal(_creator uuid, _kind text, _reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE wid uuid; n integer;
BEGIN
 IF _kind NOT IN ('withdraw','delete_account') THEN RAISE EXCEPTION 'invalid kind'; END IF;
 SELECT count(*) INTO n FROM public.creator_media WHERE creator_id = _creator;
 INSERT INTO public.creator_consent_withdrawals(creator_id,kind,reason,media_count,account_deletion_status)
 VALUES (_creator,_kind,left(_reason,1000),n,CASE WHEN _kind='delete_account' THEN 'pending_admin' ELSE 'not_requested' END)
 ON CONFLICT (creator_id) DO UPDATE SET kind = CASE WHEN EXCLUDED.kind='delete_account' THEN 'delete_account' ELSE creator_consent_withdrawals.kind END,
   account_deletion_status = CASE WHEN EXCLUDED.kind='delete_account' AND creator_consent_withdrawals.account_deletion_status='not_requested' THEN 'pending_admin' ELSE creator_consent_withdrawals.account_deletion_status END
 RETURNING id INTO wid;
 INSERT INTO public.creator_compliance_archive(withdrawal_id,creator_id,snapshot) VALUES (wid,_creator,jsonb_build_object(
  'verifications',(SELECT coalesce(jsonb_agg(to_jsonb(v)),'[]') FROM public.creator_verifications v WHERE v.user_id=_creator),
  'manifests',(SELECT coalesce(jsonb_agg(to_jsonb(m)),'[]') FROM public.content_manifests m WHERE m.creator_id=_creator),
  'participants',(SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]') FROM public.content_participants p WHERE p.creator_id=_creator),
  'consents',(SELECT coalesce(jsonb_agg(to_jsonb(c)),'[]') FROM public.participant_consents c JOIN public.content_manifests m ON m.id=c.manifest_id WHERE m.creator_id=_creator),
  'performer_index',(SELECT coalesce(jsonb_agg(to_jsonb(i)),'[]') FROM public.content_performer_index i WHERE i.creator_id=_creator),
  'media',(SELECT coalesce(jsonb_agg(to_jsonb(cm)),'[]') FROM public.creator_media cm WHERE cm.creator_id=_creator),
  'stream_copies',(SELECT coalesce(jsonb_agg(to_jsonb(b)),'[]') FROM public.bunny_video_deliveries b WHERE b.creator_id=_creator)));
 UPDATE public.creator_media SET active_until = now() WHERE creator_id=_creator AND (active_until IS NULL OR active_until > now());
 UPDATE public.bunny_video_deliveries SET state='withdrawn' WHERE creator_id=_creator AND state <> 'withdrawn';
 PERFORM public.settle_creator_withdrawal(wid, _creator);
 RETURN wid;
END $$;
REVOKE ALL ON FUNCTION public.record_creator_withdrawal(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_creator_withdrawal(uuid,text,text) TO service_role;