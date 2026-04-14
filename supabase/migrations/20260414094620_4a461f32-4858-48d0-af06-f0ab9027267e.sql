
-- Storage buckets for media
INSERT INTO storage.buckets (id, name, public) VALUES ('teasers', 'teasers', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('vault', 'vault', false);

-- Storage policies for teasers (public read, authenticated upload)
CREATE POLICY "Teasers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'teasers');

CREATE POLICY "Authenticated users can upload teasers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'teasers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own teasers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'teasers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own teasers"
ON storage.objects FOR DELETE
USING (bucket_id = 'teasers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for vault (private, owner only)
CREATE POLICY "Users can view own vault files"
ON storage.objects FOR SELECT
USING (bucket_id = 'vault' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload to own vault"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'vault' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own vault files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'vault' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own vault files"
ON storage.objects FOR DELETE
USING (bucket_id = 'vault' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Market demand table
CREATE TABLE public.market_demand (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  user_email TEXT,
  search_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.market_demand ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert market demand"
ON public.market_demand FOR INSERT
WITH CHECK (true);

CREATE POLICY "No public reads on market demand"
ON public.market_demand FOR SELECT
USING (false);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_transactions_creator_id ON public.transactions (creator_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON public.transactions (buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions (created_at);
CREATE INDEX IF NOT EXISTS idx_creator_wallets_user_id ON public.creator_wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_market_demand_keyword ON public.market_demand (keyword);
CREATE INDEX IF NOT EXISTS idx_market_demand_created_at ON public.market_demand (created_at);
