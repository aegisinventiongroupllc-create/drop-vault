CREATE TABLE public.creator_access_escrow (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), transaction_id uuid NOT NULL UNIQUE REFERENCES public.transactions(id), subscription_id uuid NOT NULL REFERENCES public.subscriptions(id), creator_id uuid NOT NULL, customer_id uuid NOT NULL,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, creator_usd numeric(12,2) NOT NULL, released_usd numeric(12,2) NOT NULL DEFAULT 0, forfeited_usd numeric(12,2) NOT NULL DEFAULT 0, settled_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (ends_at > starts_at), CHECK (creator_usd >= 0 AND released_usd >= 0 AND forfeited_usd >= 0 AND released_usd + forfeited_usd <= creator_usd)
);
GRANT SELECT ON public.creator_access_escrow TO authenticated;
GRANT ALL ON public.creator_access_escrow TO service_role;
ALTER TABLE public.creator_access_escrow ENABLE ROW LEVEL SECURITY;
CREATE POLICY escrow_owner_read ON public.creator_access_escrow FOR SELECT TO authenticated USING (creator_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX access_escrow_due ON public.creator_access_escrow(ends_at) WHERE settled_at IS NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS bit_cents_spent integer NOT NULL DEFAULT 0;
ALTER TABLE public.creator_withdrawal_settlements ADD COLUMN IF NOT EXISTS escrow_forfeited_usd numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.creator_withdrawal_settlements ADD COLUMN IF NOT EXISTS escrow_earned_released_usd numeric(12,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.spend_access_token(_user uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.token_balances; p uuid;
BEGIN
 SELECT * INTO b FROM public.token_balances WHERE user_id=_user FOR UPDATE;
 IF b.user_id IS NULL OR b.balance*100::bigint+b.bit_cents<100 THEN RAISE EXCEPTION 'INSUFFICIENT_TOKENS'; END IF;
 IF b.bit_cents>=100 THEN
  UPDATE public.token_balances SET bit_cents=bit_cents-100,updated_at=now() WHERE user_id=_user;
  RETURN NULL;
 END IF;
 UPDATE public.token_balances SET balance=balance-1,updated_at=now() WHERE user_id=_user;
 p:=public.consume_purchase_token(_user);
 IF p IS NULL THEN RAISE EXCEPTION 'Missing token purchase attribution'; END IF;
 RETURN p;
END $$;
REVOKE ALL ON FUNCTION public.spend_access_token(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.spend_access_token(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.protect_creator_wallet_balances() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF current_user IN ('authenticated','anon') AND (NEW.pending_balance IS DISTINCT FROM OLD.pending_balance OR NEW.total_earned IS DISTINCT FROM OLD.total_earned OR NEW.total_paid IS DISTINCT FROM OLD.total_paid OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN RAISE EXCEPTION 'Wallet balances are server-managed'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.unlock_creator(_creator_id uuid) RETURNS public.subscriptions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); r public.subscriptions; start_time timestamptz; p uuid; split integer; cut numeric; tx uuid; cname text;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF u=_creator_id THEN RAISE EXCEPTION 'Cannot subscribe to yourself'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_creator_id::text,0));
 IF EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=u OR user_id=_creator_id) OR EXISTS(SELECT 1 FROM public.creator_consent_withdrawals WHERE creator_id=_creator_id) THEN RAISE EXCEPTION 'ACCOUNT_LOCKED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.creator_media m WHERE m.creator_id=_creator_id AND m.bucket='vault' AND public.content_is_cleared(m.bucket,m.storage_path) AND EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id=m.bucket AND o.name=m.storage_path)) THEN RAISE EXCEPTION 'LIBRARY_EMPTY'; END IF;
 p:=public.spend_access_token(u);
 SELECT * INTO r FROM public.subscriptions WHERE customer_id=u AND creator_id=_creator_id FOR UPDATE;
 SELECT coalesce(display_name,'creator') INTO cname FROM public.profiles WHERE user_id=_creator_id;
 start_time:=greatest(now(),coalesce(r.expires_at,now()));
 IF r.id IS NULL THEN
  INSERT INTO public.subscriptions(customer_id,creator_id,creator_name,started_at,expires_at,status,last_renewed_at) VALUES(u,_creator_id,cname,now(),start_time+interval '14 days','active',now()) RETURNING * INTO r;
 ELSE
  UPDATE public.subscriptions SET expires_at=start_time+interval '14 days',status='active',warned_24h=false,renewal_count=renewal_count+1,last_renewed_at=now(),creator_name=cname,updated_at=now() WHERE id=r.id RETURNING * INTO r;
 END IF;
 split:=coalesce(public.creator_split_percent(_creator_id),90); cut:=round(20*split/100.0,2);
 INSERT INTO public.transactions(buyer_id,creator_id,amount_usd,creator_share_percent,creator_share_usd,platform_share_usd,payment_id,status,purchase_id,bit_cents_spent)
 VALUES(u,_creator_id,20,split,cut,20-cut,'unlock-'||r.id||'-'||gen_random_uuid(),'completed',p,CASE WHEN p IS NULL THEN 100 ELSE 0 END) RETURNING id INTO tx;
 INSERT INTO public.creator_access_escrow(transaction_id,subscription_id,creator_id,customer_id,starts_at,ends_at,creator_usd) VALUES(tx,r.id,_creator_id,u,start_time,start_time+interval '14 days',cut);
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.unlock_creator(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unlock_creator(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.unlock_creator_year(_creator_id uuid) RETURNS public.subscriptions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.subscriptions; i integer; b public.token_balances;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_creator_id::text,0));
 SELECT * INTO b FROM public.token_balances WHERE user_id=auth.uid() FOR UPDATE;
 IF b.user_id IS NULL OR b.balance*100::bigint+b.bit_cents<2600 THEN RAISE EXCEPTION 'INSUFFICIENT_TOKENS'; END IF;
 FOR i IN 1..26 LOOP r:=public.unlock_creator(_creator_id); END LOOP;
 RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.buy_permanent_video(_video_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); m public.creator_media; p uuid; split integer; cut numeric; tx uuid;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO m FROM public.creator_media WHERE id=_video_id;
 IF m.id IS NULL THEN RAISE EXCEPTION 'BUYOUT_UNAVAILABLE'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(m.creator_id::text,0));
 SELECT * INTO m FROM public.creator_media WHERE id=_video_id FOR SHARE;
 IF m.id IS NULL OR m.bucket<>'vault' OR NOT m.allow_permanent_buyout OR m.creator_id=u OR NOT public.content_is_cleared(m.bucket,m.storage_path) THEN RAISE EXCEPTION 'BUYOUT_UNAVAILABLE'; END IF;
 IF EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=u OR user_id=m.creator_id) OR EXISTS(SELECT 1 FROM public.creator_consent_withdrawals WHERE creator_id=m.creator_id) THEN RAISE EXCEPTION 'ACCOUNT_LOCKED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.subscriptions WHERE customer_id=u AND creator_id=m.creator_id AND status='active' AND expires_at>now()) THEN RAISE EXCEPTION 'LIBRARY_ACCESS_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM public.user_permanent_library WHERE customer_id=u AND video_id=m.id) THEN RAISE EXCEPTION 'ALREADY_OWNED'; END IF;
 p:=public.spend_access_token(u); split:=coalesce(public.creator_split_percent(m.creator_id),90); cut:=round(20*split/100.0,2);
 INSERT INTO public.transactions(buyer_id,creator_id,amount_usd,creator_share_percent,creator_share_usd,platform_share_usd,payment_id,status,purchase_id,bit_cents_spent)
 VALUES(u,m.creator_id,20,split,cut,20-cut,'buyout-'||m.id||'-'||u,'completed',p,CASE WHEN p IS NULL THEN 100 ELSE 0 END) RETURNING id INTO tx;
 INSERT INTO public.creator_wallets(user_id,pending_balance,total_earned) VALUES(m.creator_id,cut,cut) ON CONFLICT(user_id) DO UPDATE SET pending_balance=public.creator_wallets.pending_balance+cut,total_earned=public.creator_wallets.total_earned+cut,updated_at=now();
 INSERT INTO public.user_permanent_library(customer_id,video_id,creator_id,transaction_id) VALUES(u,m.id,m.creator_id,tx);
 RETURN tx;
END $$;

CREATE OR REPLACE FUNCTION public.release_creator_access_escrow() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e record; n integer:=0;
BEGIN
 FOR e IN SELECT id,creator_id FROM public.creator_access_escrow WHERE settled_at IS NULL AND ends_at<=now() ORDER BY ends_at LIMIT 500 LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended(e.creator_id::text,0));
  IF EXISTS(SELECT 1 FROM public.creator_consent_withdrawals WHERE creator_id=e.creator_id) THEN CONTINUE; END IF;
  UPDATE public.creator_access_escrow SET released_usd=creator_usd,settled_at=now() WHERE id=e.id AND settled_at IS NULL RETURNING * INTO e;
  IF NOT FOUND THEN CONTINUE; END IF;
  INSERT INTO public.creator_wallets(user_id,pending_balance,total_earned) VALUES(e.creator_id,e.creator_usd,e.creator_usd) ON CONFLICT(user_id) DO UPDATE SET pending_balance=public.creator_wallets.pending_balance+e.creator_usd,total_earned=public.creator_wallets.total_earned+e.creator_usd,updated_at=now();
  n:=n+1;
 END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.release_creator_access_escrow() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_creator_access_escrow() TO service_role;

CREATE OR REPLACE FUNCTION public.renew_subscription_atomic(_subscription_id uuid,_expected_expiry timestamptz) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.subscriptions; p uuid; split integer; cut numeric; tx uuid; b public.token_balances; key text; cid uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server authorization required' USING ERRCODE='42501'; END IF;
 SELECT creator_id INTO cid FROM public.subscriptions WHERE id=_subscription_id;
 IF cid IS NULL THEN RETURN 'skipped'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(cid::text,0));
 SELECT * INTO s FROM public.subscriptions WHERE id=_subscription_id FOR UPDATE;
 IF s.id IS NULL OR s.expires_at IS DISTINCT FROM _expected_expiry OR s.status<>'active' OR NOT s.autorenew OR s.expires_at>now() THEN RETURN 'skipped'; END IF;
 IF EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=s.customer_id OR user_id=s.creator_id) OR EXISTS(SELECT 1 FROM public.creator_consent_withdrawals WHERE creator_id=cid) OR public.get_creator_library_count(cid)=0 THEN UPDATE public.subscriptions SET status='expired',autorenew=false WHERE id=s.id; RETURN 'restricted'; END IF;
 SELECT * INTO b FROM public.token_balances WHERE user_id=s.customer_id FOR UPDATE;
 IF b.user_id IS NULL OR b.balance*100::bigint+b.bit_cents<100 THEN UPDATE public.subscriptions SET status='expired',autorenew=false WHERE id=s.id; RETURN 'insufficient_tokens'; END IF;
 key:='autorenew-'||s.id||'-'||extract(epoch FROM s.expires_at);
 IF EXISTS(SELECT 1 FROM public.transactions WHERE payment_id=key) THEN RETURN 'skipped'; END IF;
 p:=public.spend_access_token(s.customer_id); split:=coalesce(public.creator_split_percent(cid),90); cut:=round(20*split/100.0,2);
 INSERT INTO public.transactions(buyer_id,creator_id,amount_usd,creator_share_percent,creator_share_usd,platform_share_usd,payment_id,status,purchase_id,bit_cents_spent) VALUES(s.customer_id,cid,20,split,cut,20-cut,key,'completed',p,CASE WHEN p IS NULL THEN 100 ELSE 0 END) RETURNING id INTO tx;
 INSERT INTO public.creator_access_escrow(transaction_id,subscription_id,creator_id,customer_id,starts_at,ends_at,creator_usd) VALUES(tx,s.id,cid,s.customer_id,now(),now()+interval '14 days',cut);
 UPDATE public.subscriptions SET expires_at=now()+interval '14 days',last_renewed_at=now(),renewal_count=renewal_count+1,warned_24h=false,updated_at=now() WHERE id=s.id;
 RETURN 'renewed';
END $$;

CREATE OR REPLACE FUNCTION public.settle_creator_withdrawal(_withdrawal uuid,_creator uuid) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s record; e record; cents integer; claw numeric; total numeric:=0; forfeited numeric:=0; earned numeric:=0; remaining numeric; pend numeric; ded numeric; legacy_cut numeric; old numeric;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(_creator::text,0));
 SELECT final_net_usd INTO old FROM public.creator_withdrawal_settlements WHERE withdrawal_id=_withdrawal;
 IF FOUND THEN RETURN old; END IF;
 legacy_cut:=round(20*coalesce(public.creator_split_percent(_creator),90)/100.0,2);
 FOR e IN SELECT * FROM public.creator_access_escrow WHERE creator_id=_creator AND settled_at IS NULL FOR UPDATE LOOP
  claw:=round(e.creator_usd*greatest(0,least(1,extract(epoch FROM(e.ends_at-now()))/extract(epoch FROM(e.ends_at-e.starts_at)))),2);
  remaining:=e.creator_usd-e.released_usd-claw;
  earned:=earned+remaining; forfeited:=forfeited+claw;
  UPDATE public.creator_access_escrow SET released_usd=creator_usd-claw,forfeited_usd=claw,settled_at=now() WHERE id=e.id;
 END LOOP;
 INSERT INTO public.creator_wallets(user_id,pending_balance,total_earned) VALUES(_creator,earned,earned) ON CONFLICT(user_id) DO UPDATE SET pending_balance=public.creator_wallets.pending_balance+earned,total_earned=public.creator_wallets.total_earned+earned,updated_at=now();
 FOR s IN SELECT * FROM public.subscriptions WHERE creator_id=_creator AND status='active' AND expires_at>now() FOR UPDATE LOOP
  remaining:=extract(epoch FROM(s.expires_at-now()))/86400.0;
  cents:=round(remaining*100/14.0)::integer;
  SELECT coalesce(sum(forfeited_usd),0) INTO claw FROM public.creator_access_escrow WHERE subscription_id=s.id;
  IF NOT EXISTS(SELECT 1 FROM public.creator_access_escrow WHERE subscription_id=s.id) THEN total:=total+round(remaining*legacy_cut/14.0,2); claw:=round(remaining*legacy_cut/14.0,2); END IF;
  INSERT INTO public.withdrawal_customer_credits(withdrawal_id,creator_id,customer_id,source,source_id,days_remaining,bit_cents,creator_clawback_usd) VALUES(_withdrawal,_creator,s.customer_id,'vault_pass',s.id,ceil(remaining)::integer,cents,claw) ON CONFLICT(source,source_id) DO NOTHING;
  IF FOUND THEN INSERT INTO public.token_balances(user_id,balance,bit_cents) VALUES(s.customer_id,0,cents) ON CONFLICT(user_id) DO UPDATE SET bit_cents=public.token_balances.bit_cents+cents,updated_at=now(); END IF;
  UPDATE public.subscriptions SET status='expired',expires_at=now(),autorenew=false,updated_at=now() WHERE id=s.id;
 END LOOP;
 FOR s IN SELECT l.*,t.creator_share_usd FROM public.user_permanent_library l JOIN public.transactions t ON t.id=l.transaction_id WHERE l.creator_id=_creator AND l.purchased_at>now()-interval '14 days' LOOP
  INSERT INTO public.withdrawal_customer_credits(withdrawal_id,creator_id,customer_id,source,source_id,days_remaining,bit_cents,creator_clawback_usd) VALUES(_withdrawal,_creator,s.customer_id,'buyout',s.id,14,100,s.creator_share_usd) ON CONFLICT(source,source_id) DO NOTHING;
  IF FOUND THEN INSERT INTO public.token_balances(user_id,balance,bit_cents) VALUES(s.customer_id,0,100) ON CONFLICT(user_id) DO UPDATE SET bit_cents=public.token_balances.bit_cents+100,updated_at=now(); total:=total+s.creator_share_usd; END IF;
 END LOOP;
 SELECT pending_balance INTO pend FROM public.creator_wallets WHERE user_id=_creator FOR UPDATE;
 pend:=coalesce(pend,0); ded:=least(pend,total);
 UPDATE public.creator_wallets SET pending_balance=pending_balance-ded,updated_at=now() WHERE user_id=_creator;
 INSERT INTO public.creator_withdrawal_settlements(withdrawal_id,creator_id,pending_before,clawback_usd,deducted_usd,platform_covered_usd,final_net_usd,escrow_forfeited_usd,escrow_earned_released_usd) VALUES(_withdrawal,_creator,pend,total+forfeited,ded,total-ded,pend-ded,forfeited,earned);
 RETURN pend-ded;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_access_escrow() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('held_usd',coalesce(sum(creator_usd-released_usd-forfeited_usd),0),'next_release_at',min(ends_at) FILTER(WHERE settled_at IS NULL)) FROM public.creator_access_escrow WHERE creator_id=auth.uid() AND auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_my_access_escrow() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_access_escrow() TO authenticated;
