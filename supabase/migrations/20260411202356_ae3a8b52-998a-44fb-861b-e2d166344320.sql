
-- Creator wallets table
CREATE TABLE public.creator_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  ltc_address TEXT,
  pending_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own wallet" ON public.creator_wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Creators can update own wallet" ON public.creator_wallets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Creators can insert own wallet" ON public.creator_wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions table (creator ledger)
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID,
  creator_id UUID NOT NULL,
  amount_usd NUMERIC(12,2) NOT NULL,
  creator_share_percent NUMERIC(5,2) NOT NULL DEFAULT 90,
  creator_share_usd NUMERIC(12,2) NOT NULL,
  platform_share_usd NUMERIC(12,2) NOT NULL,
  payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Service role can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (true);

-- Payout batches table
CREATE TABLE public.payout_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_creators INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  nowpayments_batch_id TEXT,
  payout_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.payout_batches ENABLE ROW LEVEL SECURITY;

-- Only service role can access payout batches (admin via edge functions)
CREATE POLICY "No public access to payout batches" ON public.payout_batches
  FOR SELECT USING (false);

-- Index for fast lookups
CREATE INDEX idx_creator_wallets_balance ON public.creator_wallets (pending_balance) WHERE pending_balance > 0;
CREATE INDEX idx_transactions_creator ON public.transactions (creator_id);
CREATE INDEX idx_transactions_created ON public.transactions (created_at);
