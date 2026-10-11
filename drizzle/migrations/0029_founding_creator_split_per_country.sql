CREATE OR REPLACE FUNCTION public.creator_split_percent(_creator_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(GREATEST(
    CASE
      WHEN p.country IS NOT NULL
       AND p.created_at > now() - interval '365 days'
       AND (SELECT count(*) FROM public.profiles p2
            WHERE p2.role = 'creator' AND p2.country IS NOT NULL AND p2.country = p.country
              AND p2.created_at <= p.created_at) <= 10
      THEN 92 ELSE 90 END,
    COALESCE((SELECT max(w.split_creator) FROM public.power_weeks w
              WHERE w.creator_id = _creator_id AND w.active AND w.ends_at > now()), 0)
  ), 90)
  FROM public.profiles p WHERE p.user_id = _creator_id
$$;

CREATE OR REPLACE FUNCTION public.unlock_creator(_creator_id uuid)
RETURNS subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _balance int;
  _creator_name text;
  _existing public.subscriptions;
  _new_expiry timestamptz;
  _result public.subscriptions;
  _token_value numeric := 20.00;
  _split int;
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

  _split := COALESCE(public.creator_split_percent(_creator_id), 90);
  _creator_cut := round(_token_value * _split / 100.0, 2);
  _platform_cut := round(_token_value - _creator_cut, 2);

  INSERT INTO public.transactions
    (buyer_id, creator_id, amount_usd, creator_share_percent, creator_share_usd, platform_share_usd, payment_id, status, purchase_id)
  VALUES
    (_uid, _creator_id, _token_value, _split, _creator_cut, _platform_cut, 'unlock-' || _result.id::text || '-' || extract(epoch from now())::bigint, 'completed', _purchase);

  INSERT INTO public.creator_wallets (user_id, pending_balance, total_earned)
  VALUES (_creator_id, _creator_cut, _creator_cut)
  ON CONFLICT (user_id) DO UPDATE
  SET pending_balance = public.creator_wallets.pending_balance + _creator_cut,
      total_earned = public.creator_wallets.total_earned + _creator_cut,
      updated_at = now();

  RETURN _result;
END;
$$;