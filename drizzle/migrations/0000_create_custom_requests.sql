CREATE TABLE public.custom_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  creator_id uuid,
  creator_name text,
  description text NOT NULL DEFAULT '',
  amount_usd numeric NOT NULL DEFAULT 0,
  tokens integer NOT NULL DEFAULT 0,
  creator_share_usd numeric NOT NULL DEFAULT 0,
  platform_share_usd numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.custom_requests TO authenticated;
GRANT ALL ON public.custom_requests TO service_role;

ALTER TABLE public.custom_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers insert own requests" ON public.custom_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers view own requests" ON public.custom_requests
  FOR SELECT TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "Creators view requests to them" ON public.custom_requests
  FOR SELECT TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Creators update requests to them" ON public.custom_requests
  FOR UPDATE TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Admins view all requests" ON public.custom_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_custom_requests_created_at ON public.custom_requests (created_at DESC);
CREATE INDEX idx_custom_requests_creator ON public.custom_requests (creator_id);

CREATE TRIGGER custom_requests_updated_at BEFORE UPDATE ON public.custom_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();