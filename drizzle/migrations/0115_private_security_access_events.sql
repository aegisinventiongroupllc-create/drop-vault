CREATE TABLE public.security_access_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 event_type text NOT NULL CHECK (event_type IN ('admin_code_rejected','identity_access_denied')),
 source text NOT NULL CHECK (source IN ('admin-auth','admin-verifications')),
 actor_id uuid,
 outcome text NOT NULL DEFAULT 'blocked' CHECK (outcome = 'blocked')
);
REVOKE ALL ON public.security_access_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.security_access_events TO authenticated;
GRANT ALL ON public.security_access_events TO service_role;
ALTER TABLE public.security_access_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Verified administrators read security alerts" ON public.security_access_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX security_access_events_recent ON public.security_access_events(created_at DESC, id DESC);
COMMENT ON TABLE public.security_access_events IS 'Server-observed rejected access only; no passwords, tokens, IP addresses, identity documents, or proof of confirmed intrusion. No client writes.';