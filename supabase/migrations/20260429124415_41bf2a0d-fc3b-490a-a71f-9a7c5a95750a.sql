-- Subscriptions: hot paths (active sub lookups, expiry sweeps, creator lists)
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON public.subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_creator_id ON public.subscriptions(creator_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON public.subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_creator ON public.subscriptions(customer_id, creator_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_autorenew_expires ON public.subscriptions(autorenew, expires_at) WHERE status = 'active';

-- Transactions: revenue queries, creator earnings, history
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON public.transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_creator_id ON public.transactions(creator_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_id ON public.transactions(payment_id);

-- Token purchases & balances
CREATE INDEX IF NOT EXISTS idx_token_purchases_user_id ON public.token_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_token_purchases_payment_id ON public.token_purchases(payment_id);
CREATE INDEX IF NOT EXISTS idx_token_purchases_created_at ON public.token_purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_balances_user_id ON public.token_balances(user_id);

-- Creator media: profile loads, teaser feeds
CREATE INDEX IF NOT EXISTS idx_creator_media_creator_id ON public.creator_media(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_media_bucket ON public.creator_media(bucket);
CREATE INDEX IF NOT EXISTS idx_creator_media_creator_bucket ON public.creator_media(creator_id, bucket);
CREATE INDEX IF NOT EXISTS idx_creator_media_created_at ON public.creator_media(created_at DESC);

-- Creator wallets
CREATE INDEX IF NOT EXISTS idx_creator_wallets_user_id ON public.creator_wallets(user_id);

-- Legal consents: admin audit views
CREATE INDEX IF NOT EXISTS idx_legal_consents_email ON public.legal_consents(email);
CREATE INDEX IF NOT EXISTS idx_legal_consents_user_id ON public.legal_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_consents_created_at ON public.legal_consents(created_at DESC);

-- Profiles & roles: auth path
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles(user_id, role);

-- Power weeks
CREATE INDEX IF NOT EXISTS idx_power_weeks_creator_active ON public.power_weeks(creator_id, active);

-- Market demand
CREATE INDEX IF NOT EXISTS idx_market_demand_keyword ON public.market_demand(keyword);