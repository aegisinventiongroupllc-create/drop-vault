
-- Fix transactions insert policy - restrict to authenticated
DROP POLICY "Service role can insert transactions" ON public.transactions;
CREATE POLICY "Authenticated can insert transactions" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
