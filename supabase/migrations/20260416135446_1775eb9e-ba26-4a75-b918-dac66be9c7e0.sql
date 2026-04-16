
-- Performance indexes for scaling to millions of rows
CREATE INDEX IF NOT EXISTS idx_transactions_creator_id ON public.transactions (creator_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON public.transactions (buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions (status);

CREATE INDEX IF NOT EXISTS idx_creator_wallets_user_id ON public.creator_wallets (user_id);

CREATE INDEX IF NOT EXISTS idx_power_weeks_creator_active ON public.power_weeks (creator_id, active);

CREATE INDEX IF NOT EXISTS idx_legal_consents_user_id ON public.legal_consents (user_id);
CREATE INDEX IF NOT EXISTS idx_legal_consents_created_at ON public.legal_consents (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_demand_keyword ON public.market_demand (keyword);
