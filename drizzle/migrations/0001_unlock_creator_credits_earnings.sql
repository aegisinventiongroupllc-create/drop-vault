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
  _token_value numeric := 21.00;
  _creator_cut numeric;
  _platform_cut numeric;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _uid = _creator_id THEN
    RAISE EXCEPTION 'Cannot subscribe to yourself';
  END IF;

  SELECT balance INTO _balance FROM public.token_balances WHERE user_id = _uid FOR UPDATE;
  IF _balance IS NULL OR _balance < 1 THEN
    RAISE EXCEPTION 'INSUFFICIENT_TOKENS';
  END IF;

  SELECT COALESCE(display_name, 'creator') INTO _creator_name
  FROM public.profiles WHERE user_id = _creator_id;

  UPDATE public.token_balances
  SET balance = balance - 1, updated_at = now()
  WHERE user_id = _uid;

  SELECT * INTO _existing FROM public.subscriptions
  WHERE customer_id = _uid AND creator_id = _creator_id;

  IF _existing.id IS NULL THEN
    _new_expiry := now() + interval '14 days';
    INSERT INTO public.subscriptions
      (customer_id, creator_id, creator_name, started_at, expires_at, status, renewal_count, last_renewed_at)
    VALUES
      (_uid, _creator_id, _creator_name, now(), _new_expiry, 'active', 0, now())
    RETURNING * INTO _result;
  ELSE
    _new_expiry := CASE
      WHEN _existing.expires_at > now() THEN _existing.expires_at + interval '14 days'
      ELSE now() + interval '14 days'
    END;
    UPDATE public.subscriptions
    SET expires_at = _new_expiry,
        status = 'active',
        warned_24h = false,
        renewal_count = renewal_count + 1,
        last_renewed_at = now(),
        creator_name = _creator_name,
        updated_at = now()
    WHERE id = _existing.id
    RETURNING * INTO _result;
  END IF;

  -- Revenue split: creator 90%, platform 10%
  _creator_cut := round(_token_value * 0.90, 2);
  _platform_cut := round(_token_value - _creator_cut, 2);

  INSERT INTO public.transactions
    (buyer_id, creator_id, amount_usd, creator_share_percent, creator_share_usd, platform_share_usd, payment_id, status)
  VALUES
    (_uid, _creator_id, _token_value, 90, _creator_cut, _platform_cut, 'unlock-' || _result.id::text, 'completed');

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