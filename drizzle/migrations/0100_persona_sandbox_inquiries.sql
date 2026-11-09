CREATE TABLE public.persona_inquiries (
 user_id uuid PRIMARY KEY,
 inquiry_id text NOT NULL UNIQUE,
 environment text NOT NULL DEFAULT 'sandbox' CHECK (environment = 'sandbox'),
 status text NOT NULL DEFAULT 'created',
 created_at timestamptz NOT NULL DEFAULT now(),
 checked_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.persona_inquiries TO service_role;
REVOKE ALL ON public.persona_inquiries FROM anon, authenticated;
ALTER TABLE public.persona_inquiries ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.persona_inquiries IS 'Server-only Persona sandbox inquiry handles. Never establishes adult identity approval or publishing eligibility.';