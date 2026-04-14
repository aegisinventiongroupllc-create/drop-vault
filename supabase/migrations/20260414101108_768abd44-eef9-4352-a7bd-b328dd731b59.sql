
CREATE TABLE public.power_weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  milestone_followers INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  split_creator INTEGER NOT NULL DEFAULT 97,
  split_platform INTEGER NOT NULL DEFAULT 3,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.power_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own power weeks"
  ON public.power_weeks FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Service role full access on power_weeks"
  ON public.power_weeks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_power_weeks_creator ON public.power_weeks(creator_id);
CREATE INDEX idx_power_weeks_active ON public.power_weeks(active, ends_at);
