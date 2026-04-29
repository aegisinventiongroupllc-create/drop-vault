CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_role text NOT NULL DEFAULT 'customer',
  action_type text NOT NULL,
  action_detail text,
  metadata jsonb DEFAULT '{}'::jsonb,
  activity_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON public.activity_logs (user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON public.activity_logs (activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs (action_type);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity"
  ON public.activity_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can insert own activity"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);