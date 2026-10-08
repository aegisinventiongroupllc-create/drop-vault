CREATE TABLE public.yoti_age_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.yoti_age_checks TO authenticated;
GRANT ALL ON public.yoti_age_checks TO service_role;
ALTER TABLE public.yoti_age_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own age checks" ON public.yoti_age_checks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX yoti_age_checks_user_idx ON public.yoti_age_checks(user_id, created_at DESC);