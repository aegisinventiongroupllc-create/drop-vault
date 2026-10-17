ALTER TABLE public.custom_requests ADD COLUMN delivery_path text, ADD COLUMN delivery_uploaded_at timestamptz, ADD COLUMN delivery_access_until timestamptz, ADD COLUMN creator_archived_at timestamptz;
CREATE OR REPLACE FUNCTION public.protect_request_delivery_fields() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF current_user NOT IN ('postgres','service_role','supabase_admin') THEN
 IF TG_OP='INSERT' THEN
  IF NEW.status <> 'pending' OR NEW.delivery_path IS NOT NULL OR NEW.delivery_access_until IS NOT NULL OR NEW.fulfilled_at IS NOT NULL THEN RAISE EXCEPTION 'Request delivery is server-managed'; END IF;
 ELSE
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id OR NEW.creator_id IS DISTINCT FROM OLD.creator_id OR NEW.payment_id IS DISTINCT FROM OLD.payment_id OR NEW.delivery_path IS DISTINCT FROM OLD.delivery_path OR NEW.delivery_uploaded_at IS DISTINCT FROM OLD.delivery_uploaded_at OR NEW.delivery_access_until IS DISTINCT FROM OLD.delivery_access_until OR NEW.fulfilled_at IS DISTINCT FROM OLD.fulfilled_at OR NEW.fulfillment_deadline IS DISTINCT FROM OLD.fulfillment_deadline OR NEW.creator_archived_at IS DISTINCT FROM OLD.creator_archived_at THEN RAISE EXCEPTION 'Protected request fields'; END IF;
  IF auth.uid()=OLD.creator_id THEN
   IF OLD.status <> 'pending' OR NEW.status NOT IN ('accepted','countered','declined') OR NEW.amount_usd IS DISTINCT FROM OLD.amount_usd THEN RAISE EXCEPTION 'Invalid creator response'; END IF;
  ELSIF auth.uid()=OLD.customer_id THEN
   IF OLD.status <> 'countered' OR NEW.status NOT IN ('accepted','declined') OR (NEW.status='accepted' AND NEW.amount_usd IS DISTINCT FROM OLD.counter_offer_usd) OR NEW.counter_offer_usd IS DISTINCT FROM OLD.counter_offer_usd THEN RAISE EXCEPTION 'Invalid customer response'; END IF;
  ELSE RAISE EXCEPTION 'Not your request'; END IF;
 END IF;
END IF; RETURN NEW; END $$;
CREATE TRIGGER protect_request_delivery_fields BEFORE INSERT OR UPDATE ON public.custom_requests FOR EACH ROW EXECUTE FUNCTION public.protect_request_delivery_fields();
CREATE OR REPLACE FUNCTION public.can_upload_request_delivery(_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.custom_requests r JOIN public.profiles p ON p.user_id=r.creator_id WHERE r.creator_id=auth.uid() AND p.verification_status='approved' AND public.has_role(auth.uid(),'creator') AND r.status IN ('accepted','paid') AND r.delivery_path IS NULL AND split_part(_name,'/',1)=r.creator_id::text AND split_part(_name,'/',2)=r.id::text AND (r.expires_at IS NULL OR r.expires_at>now() OR r.status='paid')) $$;
REVOKE ALL ON FUNCTION public.can_upload_request_delivery(text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.can_upload_request_delivery(text) TO authenticated,service_role;
CREATE POLICY "Creators stage their request videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='request-deliveries' AND public.can_upload_request_delivery(name));
CREATE POLICY "Request participants read retained delivery" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='request-deliveries' AND EXISTS(SELECT 1 FROM public.custom_requests r WHERE r.delivery_path=name AND (r.creator_id=auth.uid() OR (r.customer_id=auth.uid() AND r.status='completed' AND r.delivery_access_until>now()))));
CREATE POLICY "Creators clear unattached staged uploads" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='request-deliveries' AND split_part(name,'/',1)=auth.uid()::text AND NOT EXISTS(SELECT 1 FROM public.custom_requests r WHERE r.delivery_path=name));
CREATE OR REPLACE FUNCTION public.attach_request_delivery(_request_id uuid,_path text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r public.custom_requests; BEGIN
SELECT * INTO r FROM public.custom_requests WHERE id=_request_id FOR UPDATE;
IF r.id IS NULL OR r.creator_id IS DISTINCT FROM auth.uid() OR NOT public.has_role(auth.uid(),'creator') THEN RAISE EXCEPTION 'Not your request'; END IF;
IF NOT public.can_upload_request_delivery(_path) THEN RAISE EXCEPTION 'Request is not ready for upload or creator verification is required'; END IF;
IF split_part(_path,'/',2)<>r.id::text OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='request-deliveries' AND name=_path AND metadata->>'mimetype' LIKE 'video/%') THEN RAISE EXCEPTION 'Upload the request video first'; END IF;
UPDATE public.custom_requests SET delivery_path=_path,delivery_uploaded_at=now(),status=CASE WHEN r.status='paid' THEN 'completed' ELSE r.status END,fulfilled_at=CASE WHEN r.status='paid' THEN now() ELSE NULL END,delivery_access_until=CASE WHEN r.status='paid' THEN now()+interval '14 days' ELSE NULL END WHERE id=r.id;
END $$;
REVOKE ALL ON FUNCTION public.attach_request_delivery(uuid,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.attach_request_delivery(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.activate_paid_request_delivery() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF NEW.status='paid' AND OLD.status IS DISTINCT FROM 'paid' THEN NEW.fulfillment_deadline=now()+interval '42 hours'; IF NEW.delivery_path IS NOT NULL THEN NEW.status='completed'; NEW.fulfilled_at=now(); NEW.delivery_access_until=now()+interval '14 days'; END IF; END IF; RETURN NEW; END $$;
CREATE TRIGGER activate_paid_request_delivery BEFORE UPDATE ON public.custom_requests FOR EACH ROW EXECUTE FUNCTION public.activate_paid_request_delivery();
CREATE OR REPLACE FUNCTION public.archive_request_delivery(_request_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN UPDATE public.custom_requests SET creator_archived_at=now() WHERE id=_request_id AND creator_id=auth.uid() AND status='completed' AND delivery_path IS NOT NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Only delivered requests can be cleared'; END IF; END $$;
REVOKE ALL ON FUNCTION public.archive_request_delivery(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.archive_request_delivery(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.renew_request_delivery(_request_id uuid) RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r public.custom_requests; b integer; split integer; cut numeric; purchase uuid; expiry timestamptz; BEGIN
SELECT * INTO r FROM public.custom_requests WHERE id=_request_id FOR UPDATE;
IF r.id IS NULL OR r.customer_id IS DISTINCT FROM auth.uid() OR r.status<>'completed' OR r.delivery_path IS NULL THEN RAISE EXCEPTION 'No delivered request for this account'; END IF;
IF EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Account is restricted'; END IF;
IF r.delivery_access_until>now() THEN RAISE EXCEPTION 'Access is still active'; END IF;
SELECT balance INTO b FROM public.token_balances WHERE user_id=auth.uid() FOR UPDATE; IF b IS NULL OR b<1 THEN RAISE EXCEPTION 'INSUFFICIENT_TOKENS'; END IF;
UPDATE public.token_balances SET balance=balance-1,updated_at=now() WHERE user_id=auth.uid(); purchase=public.consume_purchase_token(auth.uid()); split=COALESCE(public.creator_split_percent(r.creator_id),90); cut=round(20*split/100.0,2);
INSERT INTO public.transactions(buyer_id,creator_id,amount_usd,creator_share_percent,creator_share_usd,platform_share_usd,payment_id,status,purchase_id) VALUES(auth.uid(),r.creator_id,20,split,cut,20-cut,'request-renew-'||r.id::text||'-'||gen_random_uuid()::text,'completed',purchase);
INSERT INTO public.creator_wallets(user_id,pending_balance,total_earned) VALUES(r.creator_id,cut,cut) ON CONFLICT(user_id) DO UPDATE SET pending_balance=public.creator_wallets.pending_balance+cut,total_earned=public.creator_wallets.total_earned+cut,updated_at=now();
expiry=now()+interval '14 days'; UPDATE public.custom_requests SET delivery_access_until=expiry WHERE id=r.id; RETURN expiry; END $$;
REVOKE ALL ON FUNCTION public.renew_request_delivery(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.renew_request_delivery(uuid) TO authenticated;
CREATE INDEX custom_requests_delivery_path ON public.custom_requests(delivery_path) WHERE delivery_path IS NOT NULL;
CREATE INDEX custom_requests_creator_workspace ON public.custom_requests(creator_id,creator_archived_at,created_at DESC);