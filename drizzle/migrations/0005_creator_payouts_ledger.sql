CREATE TABLE public.creator_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  batch_id uuid,
  amount_usd numeric(12,2) NOT NULL CHECK (amount_usd > 0),
  ltc_address text,
  status text NOT NULL DEFAULT 'recorded',
  tx_hash text,
  notes text,
  balance_before numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT ON public.creator_payouts TO authenticated;
GRANT ALL ON public.creator_payouts TO service_role;
ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators view own payouts" ON public.creator_payouts FOR SELECT TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Admins view all payouts" ON public.creator_payouts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_creator_payouts_creator ON public.creator_payouts (creator_id, created_at DESC);