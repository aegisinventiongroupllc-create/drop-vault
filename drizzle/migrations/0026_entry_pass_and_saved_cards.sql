-- Vault Entry Pass: $20/year customer entry fee, credited by payment webhooks only.
CREATE TABLE public.entry_passes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payment_id TEXT NOT NULL,
  amount_usd NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL DEFAULT 'crypto',
  status TEXT NOT NULL DEFAULT 'active',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_entry_passes_payment_id ON public.entry_passes(payment_id);
CREATE INDEX idx_entry_passes_user_active ON public.entry_passes(user_id, expires_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entry_passes TO authenticated;
GRANT ALL ON public.entry_passes TO service_role;
ALTER TABLE public.entry_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own entry pass" ON public.entry_passes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all entry passes" ON public.entry_passes
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Service role inserts entry passes" ON public.entry_passes
  FOR INSERT WITH CHECK (true);

-- Idempotent entry-pass crediting. Each purchase grants 365 days, extending an
-- already-active pass instead of cutting it short.
CREATE OR REPLACE FUNCTION public.credit_entry_pass(
  _user_id UUID,
  _payment_id TEXT,
  _amount_usd NUMERIC,
  _method TEXT DEFAULT 'crypto'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing UUID;
  _expires TIMESTAMPTZ;
BEGIN
  SELECT id INTO _existing FROM public.entry_passes WHERE payment_id = _payment_id;
  IF _existing IS NOT NULL THEN RETURN FALSE; END IF;

  SELECT max(expires_at) INTO _expires
  FROM public.entry_passes
  WHERE user_id = _user_id AND status = 'active' AND expires_at > now();

  INSERT INTO public.entry_passes (user_id, payment_id, amount_usd, method, expires_at)
  VALUES (
    _user_id, _payment_id, _amount_usd, _method,
    GREATEST(coalesce(_expires, now()), now()) + interval '365 days'
  );
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_entry_pass(UUID, TEXT, NUMERIC, TEXT) TO service_role;

-- Card kept on file (processor token only; raw card data never touches the app).
CREATE TABLE public.saved_payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  processor TEXT NOT NULL DEFAULT 'ccbill',
  processor_token TEXT,
  last4 TEXT,
  brand TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_saved_payment_methods_user ON public.saved_payment_methods(user_id);

GRANT SELECT, UPDATE, DELETE ON public.saved_payment_methods TO authenticated;
GRANT ALL ON public.saved_payment_methods TO service_role;
ALTER TABLE public.saved_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own saved card" ON public.saved_payment_methods
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages saved cards" ON public.saved_payment_methods
  FOR ALL USING (true);

-- Legacy default row grants for other tables in this migration set are unchanged.
