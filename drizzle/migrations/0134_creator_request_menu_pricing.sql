CREATE TABLE public.creator_request_menus (creator_id uuid PRIMARY KEY, enabled boolean NOT NULL DEFAULT false, open_requests boolean NOT NULL DEFAULT true, open_turnaround_days integer NOT NULL DEFAULT 2, items jsonb NOT NULL DEFAULT '[]'::jsonb, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_request_menus TO authenticated;
GRANT ALL ON public.creator_request_menus TO service_role;
ALTER TABLE public.creator_request_menus ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.request_menu_creator_approved(_creator uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=_creator AND p.is_verified=true AND p.verification_status='approved') AND public.has_role(_creator,'creator') AND NOT EXISTS(SELECT 1 FROM public.account_bans b WHERE b.user_id=_creator) $$;
REVOKE ALL ON FUNCTION public.request_menu_creator_approved(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_menu_creator_approved(uuid) TO authenticated,service_role;
CREATE POLICY "Members read enabled approved menus or own menu" ON public.creator_request_menus FOR SELECT TO authenticated USING (creator_id=auth.uid() OR (enabled AND public.request_menu_creator_approved(creator_id) AND public.can_view_feed(auth.uid())));
CREATE POLICY "Approved creators insert own menu" ON public.creator_request_menus FOR INSERT TO authenticated WITH CHECK(creator_id=auth.uid() AND public.request_menu_creator_approved(auth.uid()));
CREATE POLICY "Approved creators update own menu" ON public.creator_request_menus FOR UPDATE TO authenticated USING(creator_id=auth.uid() AND public.request_menu_creator_approved(auth.uid())) WITH CHECK(creator_id=auth.uid() AND public.request_menu_creator_approved(auth.uid()));
CREATE POLICY "Approved creators delete own menu" ON public.creator_request_menus FOR DELETE TO authenticated USING(creator_id=auth.uid() AND public.request_menu_creator_approved(auth.uid()));
CREATE OR REPLACE FUNCTION public.validate_request_menu() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE item jsonb; amount numeric; BEGIN
IF jsonb_typeof(NEW.items)<>'array' OR jsonb_array_length(NEW.items)>6 THEN RAISE EXCEPTION 'A menu allows at most 6 options'; END IF;
IF NEW.open_turnaround_days<1 OR NEW.open_turnaround_days>365 THEN RAISE EXCEPTION 'Choose turnaround days from 1 to 365'; END IF;
FOR item IN SELECT value FROM jsonb_array_elements(NEW.items) LOOP
IF length(trim(coalesce(item->>'title','')))<1 OR length(item->>'title')>80 OR length(trim(coalesce(item->>'description','')))<1 OR length(item->>'description')>500 THEN RAISE EXCEPTION 'Title and short description are required'; END IF;
amount:=(item->>'price_usd')::numeric;
IF amount IS NULL OR amount='NaN'::numeric OR amount<25 OR amount>99999999.99 OR round(amount,2)<>amount THEN RAISE EXCEPTION 'Price must be at least $25 with at most two decimal places'; END IF;
IF (item->>'turnaround_days') IS NULL OR (item->>'turnaround_days')::integer NOT BETWEEN 1 AND 365 THEN RAISE EXCEPTION 'Choose turnaround days from 1 to 365'; END IF;
END LOOP; NEW.updated_at:=now(); RETURN NEW; END $$;
CREATE TRIGGER validate_creator_request_menu BEFORE INSERT OR UPDATE ON public.creator_request_menus FOR EACH ROW EXECUTE FUNCTION public.validate_request_menu();
ALTER TABLE public.custom_requests ADD COLUMN pricing_mode text NOT NULL DEFAULT 'tokens', ADD COLUMN menu_snapshot jsonb, ADD COLUMN turnaround_days integer NOT NULL DEFAULT 2, ADD COLUMN request_nonce uuid;
CREATE UNIQUE INDEX request_menu_nonce ON public.custom_requests(customer_id,request_nonce) WHERE request_nonce IS NOT NULL;
CREATE OR REPLACE FUNCTION public.protect_menu_order() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF current_user NOT IN ('postgres','service_role','supabase_admin') THEN
IF TG_OP='INSERT' AND NEW.pricing_mode<>'tokens' THEN RAISE EXCEPTION 'Use the authorized menu checkout' USING ERRCODE='42501'; END IF;
IF TG_OP='UPDATE' THEN
IF NEW.pricing_mode IS DISTINCT FROM OLD.pricing_mode OR NEW.menu_snapshot IS DISTINCT FROM OLD.menu_snapshot OR NEW.turnaround_days IS DISTINCT FROM OLD.turnaround_days OR NEW.request_nonce IS DISTINCT FROM OLD.request_nonce THEN RAISE EXCEPTION 'Order terms are server-managed' USING ERRCODE='42501'; END IF;
IF OLD.pricing_mode='menu_usd' AND (NEW.customer_id IS DISTINCT FROM OLD.customer_id OR NEW.creator_id IS DISTINCT FROM OLD.creator_id OR (NEW.amount_usd IS DISTINCT FROM OLD.amount_usd AND NOT (OLD.status='countered' AND NEW.status='accepted' AND auth.uid()=OLD.customer_id AND NEW.amount_usd=OLD.counter_offer_usd))) THEN RAISE EXCEPTION 'Order price and parties are protected' USING ERRCODE='42501'; END IF;
END IF; END IF;
IF NEW.pricing_mode='menu_usd' AND (NEW.amount_usd<25 OR NEW.amount_usd='NaN'::numeric OR round(NEW.amount_usd,2)<>NEW.amount_usd OR (NEW.counter_offer_usd IS NOT NULL AND (NEW.counter_offer_usd<25 OR NEW.counter_offer_usd='NaN'::numeric OR round(NEW.counter_offer_usd,2)<>NEW.counter_offer_usd))) THEN RAISE EXCEPTION 'Dollar requests start at $25'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER aa_protect_menu_order BEFORE INSERT OR UPDATE ON public.custom_requests FOR EACH ROW EXECUTE FUNCTION public.protect_menu_order();
CREATE OR REPLACE FUNCTION public.enforce_request_revenue_split() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE pct integer; BEGIN
IF TG_OP='UPDATE' AND OLD.status IN ('paid','completed') THEN
IF NEW.amount_usd IS DISTINCT FROM OLD.amount_usd OR NEW.creator_id IS DISTINCT FROM OLD.creator_id OR NEW.creator_share_usd IS DISTINCT FROM OLD.creator_share_usd OR NEW.platform_share_usd IS DISTINCT FROM OLD.platform_share_usd THEN RAISE EXCEPTION 'Paid request earnings are immutable' USING ERRCODE='42501'; END IF; RETURN NEW; END IF;
IF TG_OP='INSERT' OR NEW.amount_usd IS DISTINCT FROM OLD.amount_usd OR NEW.creator_id IS DISTINCT FROM OLD.creator_id OR NEW.creator_share_usd IS DISTINCT FROM OLD.creator_share_usd OR NEW.platform_share_usd IS DISTINCT FROM OLD.platform_share_usd OR (NEW.status='paid' AND OLD.status<>'paid') THEN
pct:=CASE WHEN NEW.pricing_mode='menu_usd' THEN 85 ELSE public.creator_request_split_percent(NEW.creator_id) END;
NEW.creator_share_usd:=round(NEW.amount_usd*pct/100,2); NEW.platform_share_usd:=NEW.amount_usd-NEW.creator_share_usd+5;
END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.menu_paid_deadline() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NEW.pricing_mode='menu_usd' AND NEW.status IN ('paid','completed') AND OLD.status='accepted' AND EXISTS(SELECT 1 FROM public.custom_request_payment_receipts rc WHERE rc.payment_id=NEW.payment_id AND rc.request_id=NEW.id AND rc.user_id=NEW.customer_id AND rc.base_usd=NEW.amount_usd AND rc.verified_at IS NOT NULL) THEN NEW.fulfillment_deadline:=now()+make_interval(days=>NEW.turnaround_days); END IF; RETURN NEW; END $$;
CREATE TRIGGER zz_menu_paid_deadline BEFORE UPDATE ON public.custom_requests FOR EACH ROW EXECUTE FUNCTION public.menu_paid_deadline();
CREATE OR REPLACE FUNCTION public.create_menu_request(_creator uuid,_item_index integer,_offer numeric,_description text,_nonce uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE menu public.creator_request_menus; item jsonb; base numeric; days integer; rid uuid; name text; BEGIN
IF auth.uid() IS NULL OR NOT public.can_view_feed(auth.uid()) OR auth.uid()=_creator OR NOT public.request_menu_creator_approved(_creator) THEN RAISE EXCEPTION 'An eligible account and approved creator are required' USING ERRCODE='42501'; END IF;
IF _nonce IS NULL OR length(trim(coalesce(_description,'')))<1 OR length(_description)>2000 THEN RAISE EXCEPTION 'Describe your request'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||_nonce::text,0));
SELECT id INTO rid FROM public.custom_requests WHERE customer_id=auth.uid() AND request_nonce=_nonce; IF rid IS NOT NULL THEN RETURN rid; END IF;
SELECT * INTO menu FROM public.creator_request_menus WHERE creator_id=_creator FOR SHARE;
IF menu.creator_id IS NULL OR NOT menu.enabled THEN RAISE EXCEPTION 'This creator is not taking custom requests'; END IF;
IF _item_index IS NULL THEN
IF NOT menu.open_requests THEN RAISE EXCEPTION 'Open requests are disabled'; END IF; base:=_offer; days:=menu.open_turnaround_days; item:=jsonb_build_object('title','Open request','description',_description,'price_usd',base,'turnaround_days',days);
ELSE
IF _item_index<0 OR _item_index>=jsonb_array_length(menu.items) THEN RAISE EXCEPTION 'This menu option is unavailable'; END IF; item:=menu.items->_item_index; base:=(item->>'price_usd')::numeric; days:=(item->>'turnaround_days')::integer;
END IF;
IF base IS NULL OR base='NaN'::numeric OR base<25 OR base>99999999.99 OR round(base,2)<>base THEN RAISE EXCEPTION 'Requests start at $25'; END IF;
SELECT display_name INTO name FROM public.profiles WHERE user_id=_creator;
INSERT INTO public.custom_requests(customer_id,creator_id,creator_name,description,amount_usd,tokens,creator_share_usd,platform_share_usd,status,expires_at,pricing_mode,menu_snapshot,turnaround_days,request_nonce) VALUES(auth.uid(),_creator,name,(item->>'title')||': '||_description,base,0,round(base*.85,2),base-round(base*.85,2)+5,'pending',now()+interval '14 days','menu_usd',item,days,_nonce) RETURNING id INTO rid;
IF _item_index IS NOT NULL THEN UPDATE public.custom_requests SET status='accepted' WHERE id=rid; END IF;
RETURN rid; END $$;
REVOKE ALL ON FUNCTION public.create_menu_request(uuid,integer,numeric,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_menu_request(uuid,integer,numeric,text,uuid) TO authenticated;
