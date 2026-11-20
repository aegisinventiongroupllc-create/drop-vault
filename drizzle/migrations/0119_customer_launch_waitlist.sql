CREATE TABLE public.customer_launch_waitlist (user_id uuid PRIMARY KEY, country text NOT NULL CHECK (country IN ('US','GB','CA','AU','BR','MX','DE','FR','ES','IT','CO','AR','PT')), language text NOT NULL DEFAULT 'en' CHECK (length(language) BETWEEN 2 AND 20), joined_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.customer_launch_waitlist TO authenticated;
GRANT ALL ON public.customer_launch_waitlist TO service_role;
REVOKE ALL ON public.customer_launch_waitlist FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.customer_launch_waitlist FROM authenticated;
ALTER TABLE public.customer_launch_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY customer_waitlist_read ON public.customer_launch_waitlist FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX customer_waitlist_country_joined ON public.customer_launch_waitlist(country,joined_at,user_id);
CREATE FUNCTION public.my_customer_launch_waitlist(_action text DEFAULT 'status', _country text DEFAULT NULL, _language text DEFAULT 'en') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.customer_launch_waitlist;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'customer') THEN RAISE EXCEPTION 'Customer account required' USING ERRCODE='42501'; END IF;
 IF _action='join' THEN
  IF now() >= '2027-01-01T05:00:00Z'::timestamptz THEN RAISE EXCEPTION 'Pre-launch joining has closed'; END IF;
  INSERT INTO public.customer_launch_waitlist(user_id,country,language) VALUES(auth.uid(),upper(_country),lower(_language)) ON CONFLICT(user_id) DO UPDATE SET country=excluded.country,language=excluded.language;
 ELSIF _action <> 'status' THEN RAISE EXCEPTION 'Invalid waiting-list action'; END IF;
 SELECT * INTO r FROM public.customer_launch_waitlist WHERE user_id=auth.uid();
 RETURN CASE WHEN r.user_id IS NULL THEN NULL ELSE jsonb_build_object('country',r.country,'language',r.language,'joined_at',r.joined_at) END;
END; $$;
REVOKE ALL ON FUNCTION public.my_customer_launch_waitlist(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_customer_launch_waitlist(text,text,text) TO authenticated,service_role;
CREATE FUNCTION public.customer_entry_price(_user_id uuid) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT CASE WHEN EXISTS(SELECT 1 FROM public.customer_launch_waitlist WHERE user_id=_user_id AND joined_at<'2027-01-01T05:00:00Z'::timestamptz) AND NOT EXISTS(SELECT 1 FROM public.entry_passes WHERE user_id=_user_id) THEN 10::numeric ELSE 20::numeric END $$;
REVOKE ALL ON FUNCTION public.customer_entry_price(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.customer_entry_price(uuid) TO service_role;
CREATE FUNCTION public.my_customer_entry_offer() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF; RETURN jsonb_build_object('amount_usd',public.customer_entry_price(auth.uid()),'checkout_open',now()>='2027-01-01T05:00:00Z'::timestamptz); END; $$;
REVOKE ALL ON FUNCTION public.my_customer_entry_offer() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_customer_entry_offer() TO authenticated,service_role;
CREATE FUNCTION public.admin_customer_launch_waitlist(_country text DEFAULT NULL,_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator account required' USING ERRCODE='42501'; END IF;
 IF _offset<0 THEN RAISE EXCEPTION 'Invalid page'; END IF;
 RETURN jsonb_build_object('total',(SELECT count(*) FROM public.customer_launch_waitlist WHERE _country IS NULL OR country=_country),'countries',(SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM (SELECT country,count(*) AS total FROM public.customer_launch_waitlist GROUP BY country ORDER BY count(*) DESC,country) x),'entries',(SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM (SELECT w.user_id,p.email,w.country,w.language,w.joined_at FROM public.customer_launch_waitlist w LEFT JOIN public.profiles p ON p.user_id=w.user_id WHERE _country IS NULL OR w.country=_country ORDER BY w.joined_at DESC,w.user_id LIMIT 50 OFFSET _offset) x));
END; $$;
REVOKE ALL ON FUNCTION public.admin_customer_launch_waitlist(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_customer_launch_waitlist(text,integer) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.credit_entry_pass(_user_id uuid,_payment_id text,_amount_usd numeric,_method text DEFAULT 'crypto') RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _receipt public.entry_pass_payment_receipts; _expires timestamptz; _inserted uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server payment authorization required' USING ERRCODE='42501'; END IF;
 IF _user_id IS NULL OR _payment_id IS NULL OR length(trim(_payment_id))=0 OR _amount_usd NOT IN (10,20) OR _amount_usd IS NULL OR _method IS NULL OR _method NOT IN ('crypto','card') THEN RAISE EXCEPTION 'Invalid entry-pass payment' USING ERRCODE='22023'; END IF;
 SELECT * INTO _receipt FROM public.entry_pass_payment_receipts WHERE payment_id=_payment_id FOR UPDATE;
 IF _receipt.payment_id IS NULL OR _receipt.verified_at IS NULL OR _receipt.user_id IS DISTINCT FROM _user_id OR _receipt.amount_usd IS DISTINCT FROM _amount_usd OR _receipt.method IS DISTINCT FROM _method OR _receipt.currency IS DISTINCT FROM 'USD' THEN RAISE EXCEPTION 'Verified matching payment required' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM public.entry_passes WHERE payment_id=_payment_id) THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text,0));
 IF _amount_usd=10 AND public.customer_entry_price(_user_id)<>10 THEN RAISE EXCEPTION 'Waiting-list discount not eligible' USING ERRCODE='42501'; END IF;
 SELECT max(expires_at) INTO _expires FROM public.entry_passes WHERE user_id=_user_id AND status='active' AND expires_at>now();
 INSERT INTO public.entry_passes(user_id,payment_id,amount_usd,method,expires_at) VALUES(_user_id,_payment_id,_amount_usd,_method,GREATEST(coalesce(_expires,now()),now())+interval '365 days') ON CONFLICT(payment_id) DO NOTHING RETURNING id INTO _inserted;
 RETURN _inserted IS NOT NULL;
END; $$;