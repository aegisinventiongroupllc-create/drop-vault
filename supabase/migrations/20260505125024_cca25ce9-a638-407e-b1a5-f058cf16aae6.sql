CREATE TABLE public.pending_ltc_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tokens INTEGER NOT NULL,
  amount_usd NUMERIC NOT NULL,
  ltc_amount NUMERIC(18,8) NOT NULL,
  ltc_address TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '2 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pending_ltc_user ON public.pending_ltc_payments(user_id);
CREATE INDEX idx_pending_ltc_status ON public.pending_ltc_payments(status);
CREATE UNIQUE INDEX idx_pending_ltc_amount_active ON public.pending_ltc_payments(ltc_amount) WHERE status = 'pending';

ALTER TABLE public.pending_ltc_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own pending payments"
  ON public.pending_ltc_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own pending payments"
  ON public.pending_ltc_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all pending payments"
  ON public.pending_ltc_payments FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_pending_ltc_payments_updated_at
  BEFORE UPDATE ON public.pending_ltc_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();