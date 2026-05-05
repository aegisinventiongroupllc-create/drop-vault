CREATE TABLE public.dmca_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complainant_name text NOT NULL,
  complainant_email text NOT NULL,
  complainant_address text,
  complainant_phone text,
  copyright_owner text NOT NULL,
  original_work_description text NOT NULL,
  infringing_urls text NOT NULL,
  good_faith_statement boolean NOT NULL DEFAULT false,
  accuracy_statement boolean NOT NULL DEFAULT false,
  signature text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewer_id uuid
);

ALTER TABLE public.dmca_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a DMCA request"
  ON public.dmca_requests FOR INSERT
  WITH CHECK (good_faith_statement = true AND accuracy_statement = true);

CREATE POLICY "Admins can view DMCA requests"
  ON public.dmca_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update DMCA requests"
  ON public.dmca_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_dmca_requests_updated_at
  BEFORE UPDATE ON public.dmca_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dmca_requests_status ON public.dmca_requests(status, created_at DESC);