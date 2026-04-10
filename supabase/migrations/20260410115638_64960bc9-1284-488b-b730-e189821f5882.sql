
CREATE TABLE public.legal_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  username TEXT,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  terms_version TEXT NOT NULL DEFAULT '1.0',
  consent_text TEXT NOT NULL,
  consent_type TEXT NOT NULL DEFAULT 'hold_harmless',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (age gate doesn't require auth)
CREATE POLICY "Anyone can record consent"
ON public.legal_consents
FOR INSERT
WITH CHECK (true);

-- Only service role can read (admin via edge function)
CREATE POLICY "Service role can read all consents"
ON public.legal_consents
FOR SELECT
USING (false);

-- No updates or deletes - immutable audit trail
