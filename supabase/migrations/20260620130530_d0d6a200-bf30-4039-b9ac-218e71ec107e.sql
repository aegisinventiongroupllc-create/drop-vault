
-- 1. vault_side on profiles (women/men) so we can group subscriptions under My Girls / My Guys
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vault_side TEXT NOT NULL DEFAULT 'women';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_vault_side_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_vault_side_check CHECK (vault_side IN ('women','men'));
  END IF;
END $$;

-- 2. Unlock RPC: spend 1 Bit-Token for 14-day access. Extends existing active subs.
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

  -- Debit one token
  UPDATE public.token_balances
  SET balance = balance - 1, updated_at = now()
  WHERE user_id = _uid;

  -- Upsert subscription, extending expiry if still active
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

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.unlock_creator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_creator(uuid) TO authenticated;
