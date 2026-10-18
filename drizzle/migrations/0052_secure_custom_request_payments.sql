CREATE TABLE public.custom_request_payment_receipts (
  payment_id text PRIMARY KEY,
  order_id text NOT NULL UNIQUE,
  request_id uuid NOT NULL,
  user_id uuid NOT NULL,
  base_usd numeric NOT NULL CHECK (base_usd > 0 AND base_usd <= 10001),
  amount_usd numeric NOT NULL CHECK (amount_usd = base_usd + 5),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX custom_request_payment_receipts_request_idx ON public.custom_request_payment_receipts(request_id);
REVOKE ALL ON public.custom_request_payment_receipts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.custom_request_payment_receipts TO service_role;
ALTER TABLE public.custom_request_payment_receipts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.mark_custom_request_paid(_request_id uuid, _payment_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.custom_requests; rc public.custom_request_payment_receipts;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501'; END IF;
  SELECT * INTO rc FROM public.custom_request_payment_receipts WHERE payment_id = _payment_id;
  IF rc.payment_id IS NULL OR rc.verified_at IS NULL OR rc.request_id <> _request_id THEN
    RAISE EXCEPTION 'No verified payment for this request' USING ERRCODE = '42501'; END IF;
  SELECT * INTO r FROM public.custom_requests WHERE id = _request_id FOR UPDATE;
  IF r.id IS NULL OR r.customer_id <> rc.user_id OR r.amount_usd <> rc.base_usd THEN
    RAISE EXCEPTION 'Payment does not match request' USING ERRCODE = '42501'; END IF;
  IF r.status IN ('paid','completed') THEN
    IF r.payment_id = _payment_id THEN RETURN false; END IF;
    RAISE EXCEPTION 'Request already paid' USING ERRCODE = '42501';
  END IF;
  IF r.status <> 'accepted' THEN RAISE EXCEPTION 'Request is not accepted' USING ERRCODE = '22023'; END IF;
  UPDATE public.custom_requests SET status = 'paid', payment_id = _payment_id WHERE id = r.id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.mark_custom_request_paid(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_custom_request_paid(uuid, text) TO service_role;

-- Every transition into paid needs a verified, matching receipt, whoever writes it.
CREATE OR REPLACE FUNCTION public.activate_paid_request_delivery()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    IF OLD.status <> 'accepted' OR NOT EXISTS (
      SELECT 1 FROM public.custom_request_payment_receipts rc
      WHERE rc.payment_id = NEW.payment_id AND rc.request_id = NEW.id AND rc.user_id = NEW.customer_id
        AND rc.base_usd = NEW.amount_usd AND rc.verified_at IS NOT NULL) THEN
      RAISE EXCEPTION 'Verified payment required' USING ERRCODE = '42501';
    END IF;
    NEW.fulfillment_deadline = now() + interval '42 hours';
    IF NEW.delivery_path IS NOT NULL THEN NEW.status = 'completed'; NEW.fulfilled_at = now(); NEW.delivery_access_until = now() + interval '14 days'; END IF;
  ELSIF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' AND OLD.status <> 'paid' THEN
    RAISE EXCEPTION 'Verified payment required' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.protect_request_delivery_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
IF current_user NOT IN ('postgres','service_role','supabase_admin') THEN
 IF TG_OP='INSERT' THEN
  IF NEW.status <> 'pending' OR NEW.payment_id IS NOT NULL OR NEW.delivery_path IS NOT NULL OR NEW.delivery_access_until IS NOT NULL OR NEW.fulfilled_at IS NOT NULL OR NEW.fulfillment_deadline IS NOT NULL
     OR NEW.amount_usd IS NULL OR NEW.amount_usd <= 0 OR NEW.amount_usd > 10001 THEN RAISE EXCEPTION 'Request delivery is server-managed'; END IF;
 ELSE
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id OR NEW.creator_id IS DISTINCT FROM OLD.creator_id OR NEW.payment_id IS DISTINCT FROM OLD.payment_id OR NEW.delivery_path IS DISTINCT FROM OLD.delivery_path OR NEW.delivery_uploaded_at IS DISTINCT FROM OLD.delivery_uploaded_at OR NEW.delivery_access_until IS DISTINCT FROM OLD.delivery_access_until OR NEW.fulfilled_at IS DISTINCT FROM OLD.fulfilled_at OR NEW.fulfillment_deadline IS DISTINCT FROM OLD.fulfillment_deadline OR NEW.creator_archived_at IS DISTINCT FROM OLD.creator_archived_at THEN RAISE EXCEPTION 'Protected request fields'; END IF;
  IF auth.uid()=OLD.creator_id THEN
   IF OLD.status <> 'pending' OR NEW.status NOT IN ('accepted','countered','declined') OR NEW.amount_usd IS DISTINCT FROM OLD.amount_usd THEN RAISE EXCEPTION 'Invalid creator response'; END IF;
  ELSIF auth.uid()=OLD.customer_id THEN
   IF OLD.status <> 'countered' OR NEW.status NOT IN ('accepted','declined') OR (NEW.status='accepted' AND NEW.amount_usd IS DISTINCT FROM OLD.counter_offer_usd) OR NEW.counter_offer_usd IS DISTINCT FROM OLD.counter_offer_usd THEN RAISE EXCEPTION 'Invalid customer response'; END IF;
  ELSE RAISE EXCEPTION 'Not your request'; END IF;
 END IF;
END IF; RETURN NEW; END $$;