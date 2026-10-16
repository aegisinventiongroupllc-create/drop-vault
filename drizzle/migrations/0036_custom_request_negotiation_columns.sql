-- Add negotiation and fulfillment columns to custom_requests
ALTER TABLE public.custom_requests
  ADD COLUMN IF NOT EXISTS counter_offer_usd numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS counter_message text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fulfillment_deadline timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz DEFAULT NULL;

-- Backfill expires_at for existing rows (14 days from creation)
UPDATE public.custom_requests
SET expires_at = created_at + interval '14 days'
WHERE expires_at IS NULL;

-- Allow customers to update their own requests (accept/decline counter-offers)
CREATE POLICY "Customers update own requests"
  ON public.custom_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);