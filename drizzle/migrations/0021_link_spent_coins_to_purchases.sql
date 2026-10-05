ALTER TABLE public.token_purchases
  ADD COLUMN IF NOT EXISTS package_type text,
  ADD COLUMN IF NOT EXISTS platform_fee_collected numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_remaining integer NOT NULL DEFAULT 0;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS purchase_id uuid REFERENCES public.token_purchases(id);

CREATE INDEX IF NOT EXISTS token_purchases_user_remaining_idx
  ON public.token_purchases (user_id, created_at) WHERE tokens_remaining > 0;
CREATE INDEX IF NOT EXISTS transactions_purchase_idx ON public.transactions (purchase_id);

-- Backfill: label packages, then assign each user's current balance to their newest purchases.
UPDATE public.token_purchases
SET package_type = CASE WHEN tokens_credited = 5 THEN '5_tokens' WHEN tokens_credited = 1 THEN '1_token' ELSE 'custom' END,
    platform_fee_collected = CASE WHEN tokens_credited IN (1,5) THEN 1 ELSE 0 END
WHERE package_type IS NULL;

WITH ranked AS (
  SELECT p.id, p.tokens_credited, COALESCE(b.balance, 0) AS bal,
         COALESCE(SUM(p.tokens_credited) OVER (PARTITION BY p.user_id ORDER BY p.created_at DESC, p.id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS newer
  FROM public.token_purchases p
  LEFT JOIN public.token_balances b ON b.user_id = p.user_id
)
UPDATE public.token_purchases t
SET tokens_remaining = GREATEST(0, LEAST(r.tokens_credited, r.bal - r.newer))
FROM ranked r WHERE r.id = t.id;

-- Takes one coin from the customer's oldest purchase that still has coins left.
CREATE OR REPLACE FUNCTION public.consume_purchase_token(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _pid uuid;
BEGIN
  SELECT id INTO _pid FROM public.token_purchases
  WHERE user_id = _user_id AND tokens_remaining > 0
  ORDER BY created_at, id
  LIMIT 1 FOR UPDATE;
  IF _pid IS NOT NULL THEN
    UPDATE public.token_purchases SET tokens_remaining = tokens_remaining - 1 WHERE id = _pid;
  END IF;
  RETURN _pid;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_purchase_token(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_purchase_token(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.credit_tokens(_user_id uuid, _payment_id text, _tokens integer, _amount_usd numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _existing uuid;
BEGIN
  SELECT id INTO _existing FROM public.token_purchases WHERE payment_id = _payment_id;
  IF _existing IS NOT NULL THEN RETURN FALSE; END IF;

  INSERT INTO public.token_purchases
    (user_id, payment_id, tokens_credited, amount_usd, status, package_type, platform_fee_collected, tokens_remaining)
  VALUES
    (_user_id, _payment_id, _tokens, _amount_usd, 'finished',
     CASE WHEN _tokens = 5 THEN '5_tokens' WHEN _tokens = 1 THEN '1_token' ELSE 'custom' END,
     1, _tokens);

  INSERT INTO public.token_balances (user_id, balance, updated_at)
  VALUES (_user_id, _tokens, now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.token_balances.balance + EXCLUDED.balance, updated_at = now();
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.credit_tokens(uuid, text, integer, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_tokens(uuid, text, integer, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.unlock_creator(_creator_id uuid)
RETURNS public.subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _balance int;
  _creator_name text;
  _existing public.subscriptions;
  _new_expiry timestamptz;
  _result public.subscriptions;
  _token_value numeric := 20.00;
  _creator_cut numeric;
  _platform_cut numeric;
  _purchase uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _uid = _creator_id THEN RAISE EXCEPTION 'Cannot subscribe to yourself'; END IF;

  SELECT balance INTO _balance FROM public.token_balances WHERE user_id = _uid FOR UPDATE;
  IF _balance IS NULL OR _balance < 1 THEN RAISE EXCEPTION 'INSUFFICIENT_TOKENS'; END IF;

  SELECT COALESCE(display_name, 'creator') INTO _creator_name FROM public.profiles WHERE user_id = _creator_id;

  UPDATE public.token_balances SET balance = balance - 1, updated_at = now() WHERE user_id = _uid;
  _purchase := public.consume_purchase_token(_uid);

  SELECT * INTO _existing FROM public.subscriptions WHERE customer_id = _uid AND creator_id = _creator_id;

  IF _existing.id IS NULL THEN
    _new_expiry := now() + interval '14 days';
    INSERT INTO public.subscriptions
      (customer_id, creator_id, creator_name, started_at, expires_at, status, renewal_count, last_renewed_at)
    VALUES (_uid, _creator_id, _creator_name, now(), _new_expiry, 'active', 0, now())
    RETURNING * INTO _result;
  ELSE
    _new_expiry := CASE WHEN _existing.expires_at > now() THEN _existing.expires_at + interval '14 days' ELSE now() + interval '14 days' END;
    UPDATE public.subscriptions
    SET expires_at = _new_expiry, status = 'active', warned_24h = false,
        renewal_count = renewal_count + 1, last_renewed_at = now(),
        creator_name = _creator_name, updated_at = now()
    WHERE id = _existing.id
    RETURNING * INTO _result;
  END IF;

  _creator_cut := round(_token_value * 0.90, 2);
  _platform_cut := round(_token_value - _creator_cut, 2);

  INSERT INTO public.transactions
    (buyer_id, creator_id, amount_usd, creator_share_percent, creator_share_usd, platform_share_usd, payment_id, status, purchase_id)
  VALUES
    (_uid, _creator_id, _token_value, 90, _creator_cut, _platform_cut, 'unlock-' || _result.id::text || '-' || extract(epoch from now())::bigint, 'completed', _purchase);

  INSERT INTO public.creator_wallets (user_id, pending_balance, total_earned)
  VALUES (_creator_id, _creator_cut, _creator_cut)
  ON CONFLICT (user_id) DO UPDATE
  SET pending_balance = public.creator_wallets.pending_balance + _creator_cut,
      total_earned = public.creator_wallets.total_earned + _creator_cut,
      updated_at = now();

  RETURN _result;
END;
$$;
REVOKE ALL ON FUNCTION public.unlock_creator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_creator(uuid) TO authenticated;