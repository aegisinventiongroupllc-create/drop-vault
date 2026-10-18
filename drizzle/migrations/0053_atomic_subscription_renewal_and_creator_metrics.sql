CREATE OR REPLACE FUNCTION public.renew_subscription_atomic(_subscription_id uuid, _expected_expiry timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.subscriptions; b integer; purchase uuid; split integer; cut numeric; key text;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server authorization required' USING ERRCODE='42501'; END IF;
 SELECT * INTO s FROM public.subscriptions WHERE id=_subscription_id FOR UPDATE;
 IF s.id IS NULL OR s.expires_at IS DISTINCT FROM _expected_expiry OR s.status<>'active' OR NOT s.autorenew OR s.expires_at>now() THEN RETURN 'skipped'; END IF;
 IF EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=s.customer_id OR user_id=s.creator_id) THEN
 UPDATE public.subscriptions SET status='expired',autorenew=false WHERE id=s.id; RETURN 'restricted'; END IF;
 SELECT balance INTO b FROM public.token_balances WHERE user_id=s.customer_id FOR UPDATE;
 IF b IS NULL OR b<1 THEN UPDATE public.subscriptions SET status='expired',autorenew=false WHERE id=s.id; RETURN 'insufficient_tokens'; END IF;
 key='autorenew-'||s.id::text||'-'||extract(epoch FROM s.expires_at)::text;
 IF EXISTS(SELECT 1 FROM public.transactions WHERE payment_id=key) THEN RETURN 'skipped'; END IF;
 UPDATE public.token_balances SET balance=balance-1,updated_at=now() WHERE user_id=s.customer_id;
 purchase=public.consume_purchase_token(s.customer_id);
 IF purchase IS NULL THEN RAISE EXCEPTION 'Missing token purchase attribution'; END IF;
 split=COALESCE(public.creator_split_percent(s.creator_id),90); cut=round(20*split/100.0,2);
 INSERT INTO public.transactions(buyer_id,creator_id,amount_usd,creator_share_percent,creator_share_usd,platform_share_usd,payment_id,status,purchase_id)
 VALUES(s.customer_id,s.creator_id,20,split,cut,20-cut,key,'completed',purchase);
 INSERT INTO public.creator_wallets(user_id,pending_balance,total_earned) VALUES(s.creator_id,cut,cut)
 ON CONFLICT(user_id) DO UPDATE SET pending_balance=public.creator_wallets.pending_balance+cut,total_earned=public.creator_wallets.total_earned+cut,updated_at=now();
 UPDATE public.subscriptions SET expires_at=now()+interval '14 days',last_renewed_at=now(),renewal_count=renewal_count+1,warned_24h=false,updated_at=now() WHERE id=s.id;
 RETURN 'renewed';
END $$;
REVOKE ALL ON FUNCTION public.renew_subscription_atomic(uuid,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.renew_subscription_atomic(uuid,timestamptz) TO service_role;
CREATE OR REPLACE FUNCTION public.get_my_creator_metrics()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT jsonb_build_object(
 'total_views',COALESCE((SELECT sum(views) FROM public.creator_media WHERE creator_id=auth.uid()),0),
 'months',COALESCE((SELECT jsonb_agg(m ORDER BY m.month DESC) FROM (
 SELECT to_char(created_at AT TIME ZONE 'UTC','YYYY-MM') AS month,sum(creator_share_usd) AS earned
 FROM public.transactions WHERE creator_id=auth.uid() AND status='completed'
 AND created_at >= (date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') - interval '5 months'
 GROUP BY 1) m),'[]'::jsonb),
 'fans',COALESCE((SELECT jsonb_agg(f) FROM (
 SELECT row_number() OVER(ORDER BY sum(t.amount_usd) DESC,t.buyer_id)::integer AS rank,COALESCE(p.display_name,'Fan') AS name,sum(t.amount_usd) AS spent
 FROM public.transactions t LEFT JOIN public.public_profiles p ON p.user_id=t.buyer_id
 WHERE t.creator_id=auth.uid() AND t.status='completed' AND t.buyer_id IS NOT NULL
 GROUP BY t.buyer_id,p.display_name ORDER BY sum(t.amount_usd) DESC,t.buyer_id LIMIT 5) f),'[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.get_my_creator_metrics() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_creator_metrics() TO authenticated;