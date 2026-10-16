CREATE INDEX IF NOT EXISTS idx_profiles_role_country_side ON public.profiles (role, country, vault_side);
CREATE INDEX IF NOT EXISTS idx_creator_media_creator ON public.creator_media (creator_id);
CREATE INDEX IF NOT EXISTS idx_transactions_creator_status ON public.transactions (creator_id, status);
CREATE INDEX IF NOT EXISTS idx_creator_hearts_creator ON public.creator_hearts (creator_id);