-- Subscriptions: 14-day creator access with optional autopay
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  creator_name text,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  autorenew boolean NOT NULL DEFAULT false,
  warned_24h boolean NOT NULL DEFAULT false,
  last_renewed_at timestamptz,
  renewal_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, creator_id)
);

CREATE INDEX idx_subscriptions_expires_at ON public.subscriptions (expires_at);
CREATE INDEX idx_subscriptions_customer ON public.subscriptions (customer_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own subscriptions"
ON public.subscriptions FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Customers insert own subscriptions"
ON public.subscriptions FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers update own subscriptions"
ON public.subscriptions FOR UPDATE
USING (auth.uid() = customer_id);

CREATE POLICY "Admins view all subscriptions"
ON public.subscriptions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Token balance ledger (so autopay can deduct server-side)
CREATE TABLE public.token_balances (
  user_id uuid NOT NULL PRIMARY KEY,
  balance integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.token_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own token balance"
ON public.token_balances FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all balances"
ON public.token_balances FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER trg_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_token_balances_updated_at
BEFORE UPDATE ON public.token_balances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();