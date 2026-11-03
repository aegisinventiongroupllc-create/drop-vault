CREATE TABLE public.creator_calendar_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 creator_id uuid NOT NULL DEFAULT auth.uid(),
 title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
 notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
 kind text NOT NULL DEFAULT 'reminder' CHECK (kind IN ('request_plan','video','teaser','reminder')),
 scheduled_at timestamptz NOT NULL,
 remind_at timestamptz,
 completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_calendar_items TO authenticated;
GRANT ALL ON public.creator_calendar_items TO service_role;
ALTER TABLE public.creator_calendar_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators own their calendar" ON public.creator_calendar_items FOR ALL TO authenticated USING (creator_id = auth.uid() AND public.has_role(auth.uid(), 'creator')) WITH CHECK (creator_id = auth.uid() AND public.has_role(auth.uid(), 'creator'));
CREATE INDEX creator_calendar_schedule ON public.creator_calendar_items (creator_id, scheduled_at);
CREATE INDEX creator_calendar_reminders ON public.creator_calendar_items (creator_id, remind_at) WHERE completed_at IS NULL;
CREATE TRIGGER calendar_updated_at BEFORE UPDATE ON public.creator_calendar_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.custom_requests ADD COLUMN IF NOT EXISTS calendar_agreed_at timestamptz;
CREATE OR REPLACE FUNCTION public.stamp_request_calendar_agreement() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
  IF NEW.calendar_agreed_at IS NOT NULL THEN RAISE EXCEPTION 'Agreement time is server-managed'; END IF;
 ELSIF NEW.calendar_agreed_at IS DISTINCT FROM OLD.calendar_agreed_at THEN
  RAISE EXCEPTION 'Agreement time is server-managed';
 END IF;
 IF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status IN ('pending', 'countered') THEN NEW.calendar_agreed_at = now(); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER zz_stamp_request_calendar_agreement BEFORE INSERT OR UPDATE ON public.custom_requests FOR EACH ROW EXECUTE FUNCTION public.stamp_request_calendar_agreement();
CREATE OR REPLACE FUNCTION public.activate_paid_request_delivery()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    IF OLD.status <> 'accepted' OR NOT EXISTS (
      SELECT 1 FROM public.custom_request_payment_receipts rc
      WHERE rc.payment_id = NEW.payment_id AND rc.request_id = NEW.id AND rc.user_id = NEW.customer_id
        AND rc.base_usd = NEW.amount_usd AND rc.verified_at IS NOT NULL) THEN
      RAISE EXCEPTION 'Verified payment required' USING ERRCODE = '42501';
    END IF;
    NEW.fulfillment_deadline = now() + interval '48 hours';
    IF NEW.delivery_path IS NOT NULL THEN NEW.status = 'completed'; NEW.fulfilled_at = now(); NEW.delivery_access_until = now() + interval '14 days'; END IF;
  ELSIF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' AND OLD.status <> 'paid' THEN
    RAISE EXCEPTION 'Verified payment required' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$;
COMMENT ON COLUMN public.custom_requests.calendar_agreed_at IS 'Server-stamped agreement reminder; payment is not implied. Fulfillment deadline begins at verified payment.';