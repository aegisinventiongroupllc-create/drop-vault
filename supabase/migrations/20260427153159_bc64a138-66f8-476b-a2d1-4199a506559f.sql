-- Wallet top-up history
CREATE TABLE public.token_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payment_id TEXT NOT NULL,
  tokens_credited INTEGER NOT NULL,
  amount_usd NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'finished',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_token_purchases_payment_id ON public.token_purchases(payment_id);
CREATE INDEX idx_token_purchases_user_id ON public.token_purchases(user_id, created_at DESC);

ALTER TABLE public.token_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own purchases"
ON public.token_purchases FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all purchases"
ON public.token_purchases FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Atomic credit function (service role only, bypasses RLS)
CREATE OR REPLACE FUNCTION public.credit_tokens(
  _user_id UUID,
  _payment_id TEXT,
  _tokens INTEGER,
  _amount_usd NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing UUID;
BEGIN
  -- Idempotency: if payment_id already credited, skip
  SELECT id INTO _existing FROM public.token_purchases WHERE payment_id = _payment_id;
  IF _existing IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.token_purchases (user_id, payment_id, tokens_credited, amount_usd, status)
  VALUES (_user_id, _payment_id, _tokens, _amount_usd, 'finished');

  INSERT INTO public.token_balances (user_id, balance, updated_at)
  VALUES (_user_id, _tokens, now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.token_balances.balance + EXCLUDED.balance,
        updated_at = now();

  RETURN TRUE;
END;
$$;

-- token_balances needs a PK on user_id for ON CONFLICT to work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.token_balances'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.token_balances ADD PRIMARY KEY (user_id);
  END IF;
END $$;