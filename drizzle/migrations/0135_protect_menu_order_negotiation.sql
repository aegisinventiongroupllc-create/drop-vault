CREATE OR REPLACE FUNCTION public.protect_menu_order() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF current_user NOT IN ('postgres','service_role','supabase_admin') THEN
IF TG_OP='INSERT' AND NEW.pricing_mode<>'tokens' THEN RAISE EXCEPTION 'Use the authorized menu checkout' USING ERRCODE='42501'; END IF;
IF TG_OP='UPDATE' THEN
IF NEW.pricing_mode IS DISTINCT FROM OLD.pricing_mode OR NEW.menu_snapshot IS DISTINCT FROM OLD.menu_snapshot OR NEW.turnaround_days IS DISTINCT FROM OLD.turnaround_days OR NEW.request_nonce IS DISTINCT FROM OLD.request_nonce THEN RAISE EXCEPTION 'Order terms are server-managed' USING ERRCODE='42501'; END IF;
IF OLD.pricing_mode='menu_usd' THEN
IF NEW.customer_id IS DISTINCT FROM OLD.customer_id OR NEW.creator_id IS DISTINCT FROM OLD.creator_id OR NEW.description IS DISTINCT FROM OLD.description THEN RAISE EXCEPTION 'Order parties and description are protected' USING ERRCODE='42501'; END IF;
IF (NEW.counter_offer_usd IS DISTINCT FROM OLD.counter_offer_usd OR NEW.counter_message IS DISTINCT FROM OLD.counter_message) AND auth.uid() IS DISTINCT FROM OLD.creator_id THEN RAISE EXCEPTION 'Only the creator can send a counter' USING ERRCODE='42501'; END IF;
IF NEW.amount_usd IS DISTINCT FROM OLD.amount_usd AND NOT (OLD.status='countered' AND NEW.status='accepted' AND auth.uid()=OLD.customer_id AND NEW.amount_usd=OLD.counter_offer_usd) THEN RAISE EXCEPTION 'Order price is protected' USING ERRCODE='42501'; END IF;
IF NEW.status IS DISTINCT FROM OLD.status AND NOT ((auth.uid()=OLD.creator_id AND OLD.status='pending' AND NEW.status IN ('accepted','declined','countered')) OR (auth.uid()=OLD.customer_id AND ((OLD.status='countered' AND NEW.status='accepted' AND NEW.amount_usd=OLD.counter_offer_usd) OR (OLD.status IN ('pending','countered','accepted') AND NEW.status='declined')))) THEN RAISE EXCEPTION 'This request transition is not allowed' USING ERRCODE='42501'; END IF;
END IF; END IF; END IF;
IF NEW.pricing_mode='menu_usd' AND (NEW.amount_usd<25 OR NEW.amount_usd='NaN'::numeric OR round(NEW.amount_usd,2)<>NEW.amount_usd OR (NEW.counter_offer_usd IS NOT NULL AND (NEW.counter_offer_usd<25 OR NEW.counter_offer_usd='NaN'::numeric OR round(NEW.counter_offer_usd,2)<>NEW.counter_offer_usd))) THEN RAISE EXCEPTION 'Dollar requests start at $25'; END IF;
RETURN NEW; END $$;