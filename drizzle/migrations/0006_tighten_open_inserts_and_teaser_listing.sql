DROP POLICY IF EXISTS "Anyone can record consent" ON public.legal_consents;
CREATE POLICY "Record own or anonymous consent" ON public.legal_consents
FOR INSERT TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND consent_type IN ('age_tos_contractor_gate','checkout_consent','age_18_plus','hold_harmless','creator_safety','terms_of_service')
  AND length(consent_text) BETWEEN 1 AND 5000
  AND length(terms_version) BETWEEN 1 AND 20
  AND (email IS NULL OR length(email) <= 320)
  AND (username IS NULL OR length(username) <= 100)
  AND (ip_address IS NULL OR length(ip_address) <= 64)
  AND (user_agent IS NULL OR length(user_agent) <= 1000)
);

DROP POLICY IF EXISTS "Anyone can insert market demand" ON public.market_demand;
CREATE POLICY "Submit valid market demand" ON public.market_demand
FOR INSERT TO anon, authenticated
WITH CHECK (
  length(btrim(keyword)) BETWEEN 1 AND 100
  AND (user_email IS NULL OR length(user_email) <= 320)
  AND search_count = 1
);

DROP POLICY IF EXISTS "Teasers are publicly accessible" ON storage.objects;
CREATE POLICY "Creators list own teasers" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'teasers' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins list all teasers" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'teasers' AND public.has_role(auth.uid(), 'admin'));