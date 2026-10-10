DROP POLICY IF EXISTS "Service role manages saved cards" ON public.saved_payment_methods;
REVOKE INSERT, UPDATE, DELETE ON public.saved_payment_methods FROM anon, authenticated;
GRANT SELECT ON public.saved_payment_methods TO authenticated;
GRANT ALL ON public.saved_payment_methods TO service_role;