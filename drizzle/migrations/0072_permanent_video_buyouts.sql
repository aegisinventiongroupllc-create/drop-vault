ALTER TABLE public.creator_media ADD COLUMN allow_permanent_buyout boolean NOT NULL DEFAULT false;

CREATE TABLE public.user_permanent_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.creator_media(id) ON DELETE RESTRICT,
  creator_id uuid NOT NULL,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, video_id)
);
CREATE INDEX user_permanent_library_customer_idx ON public.user_permanent_library(customer_id, purchased_at DESC);
GRANT SELECT ON public.user_permanent_library TO authenticated;
GRANT ALL ON public.user_permanent_library TO service_role;
ALTER TABLE public.user_permanent_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers view own permanent library" ON public.user_permanent_library FOR SELECT TO authenticated USING (customer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.buy_permanent_video(_video_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE u uuid:=auth.uid(); m public.creator_media; b integer; purchase uuid; split integer; cut numeric; tx uuid;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO m FROM public.creator_media WHERE id=_video_id FOR SHARE;
 IF m.id IS NULL OR m.bucket<>'vault' OR NOT m.allow_permanent_buyout THEN RAISE EXCEPTION 'BUYOUT_UNAVAILABLE'; END IF;
 IF m.creator_id=u THEN RAISE EXCEPTION 'BUYOUT_UNAVAILABLE'; END IF;
 IF EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=u OR user_id=m.creator_id) THEN RAISE EXCEPTION 'ACCOUNT_LOCKED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.subscriptions WHERE customer_id=u AND creator_id=m.creator_id AND status='active' AND expires_at>now()) THEN RAISE EXCEPTION 'LIBRARY_ACCESS_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM public.user_permanent_library WHERE customer_id=u AND video_id=m.id) THEN RAISE EXCEPTION 'ALREADY_OWNED'; END IF;
 SELECT balance INTO b FROM public.token_balances WHERE user_id=u FOR UPDATE;
 IF b IS NULL OR b<1 THEN RAISE EXCEPTION 'INSUFFICIENT_TOKENS'; END IF;
 UPDATE public.token_balances SET balance=balance-1,updated_at=now() WHERE user_id=u;
 purchase:=public.consume_purchase_token(u);
 IF purchase IS NULL THEN RAISE EXCEPTION 'Missing token purchase attribution'; END IF;
 split:=COALESCE(public.creator_split_percent(m.creator_id),90); cut:=round(20*split/100.0,2);
 -- 'buyout-' payment ids are ignored by the paid-follower trigger.
 INSERT INTO public.transactions(buyer_id,creator_id,amount_usd,creator_share_percent,creator_share_usd,platform_share_usd,payment_id,status,purchase_id)
 VALUES(u,m.creator_id,20,split,cut,20-cut,'buyout-'||m.id::text||'-'||u::text,'completed',purchase) RETURNING id INTO tx;
 INSERT INTO public.creator_wallets(user_id,pending_balance,total_earned) VALUES(m.creator_id,cut,cut)
 ON CONFLICT(user_id) DO UPDATE SET pending_balance=public.creator_wallets.pending_balance+cut,total_earned=public.creator_wallets.total_earned+cut,updated_at=now();
 INSERT INTO public.user_permanent_library(customer_id,video_id,creator_id,transaction_id) VALUES(u,m.id,m.creator_id,tx);
 RETURN tx;
END $$;
REVOKE ALL ON FUNCTION public.buy_permanent_video(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_permanent_video(uuid) TO authenticated;