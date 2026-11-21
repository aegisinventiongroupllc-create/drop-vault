CREATE TABLE public.customer_waitlist_campaign (id boolean PRIMARY KEY DEFAULT true CHECK(id), started_at timestamptz NOT NULL DEFAULT now(), started_by uuid NOT NULL);
GRANT SELECT ON public.customer_waitlist_campaign TO authenticated; GRANT ALL ON public.customer_waitlist_campaign TO service_role; REVOKE ALL ON public.customer_waitlist_campaign FROM anon;
ALTER TABLE public.customer_waitlist_campaign ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaign_admin_read ON public.customer_waitlist_campaign FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.customer_waitlist_delivery (user_id uuid PRIMARY KEY, state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','suppressed','failed','no_email')), attempted_at timestamptz, sent_at timestamptz);
GRANT SELECT ON public.customer_waitlist_delivery TO authenticated; GRANT ALL ON public.customer_waitlist_delivery TO service_role; REVOKE ALL ON public.customer_waitlist_delivery FROM anon;
ALTER TABLE public.customer_waitlist_delivery ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_private_read ON public.customer_waitlist_delivery FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.start_customer_waitlist_campaign(_actor uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' OR NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'Administrator authorization required' USING ERRCODE='42501'; END IF;
 IF now()<'2027-01-01T05:00:00Z'::timestamptz THEN RAISE EXCEPTION 'Customer launch has not opened'; END IF;
 INSERT INTO public.customer_waitlist_campaign(id,started_by) VALUES(true,_actor) ON CONFLICT(id) DO NOTHING;
 END $$;
REVOKE ALL ON FUNCTION public.start_customer_waitlist_campaign(uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.start_customer_waitlist_campaign(uuid) TO service_role;
CREATE FUNCTION public.customer_waitlist_campaign_batch() RETURNS TABLE(user_id uuid,email text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server authorization required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(73662901);
 RETURN QUERY WITH candidates AS (
 SELECT w.user_id,p.email FROM public.customer_launch_waitlist w JOIN public.customer_waitlist_campaign c ON w.joined_at<=c.started_at LEFT JOIN public.profiles p ON p.user_id=w.user_id LEFT JOIN public.customer_waitlist_delivery d ON d.user_id=w.user_id
 WHERE public.has_role(w.user_id,'customer') AND NOT EXISTS(SELECT 1 FROM public.entry_passes e WHERE e.user_id=w.user_id AND e.status='active' AND e.expires_at>now()) AND (d.user_id IS NULL OR d.state='pending' OR (d.state='sending' AND d.attempted_at<now()-interval '5 minutes')) ORDER BY w.joined_at,w.user_id LIMIT 25
 ), claimed AS (INSERT INTO public.customer_waitlist_delivery(user_id,state,attempted_at) SELECT candidates.user_id,'sending',now() FROM candidates ON CONFLICT(user_id) DO UPDATE SET state='sending',attempted_at=now() RETURNING customer_waitlist_delivery.user_id)
 SELECT candidates.user_id,candidates.email FROM candidates JOIN claimed ON claimed.user_id=candidates.user_id;
 END $$;
REVOKE ALL ON FUNCTION public.customer_waitlist_campaign_batch() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.customer_waitlist_campaign_batch() TO service_role;
CREATE FUNCTION public.my_customer_waitlist_invitation() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('invited',EXISTS(SELECT 1 FROM public.customer_launch_waitlist w JOIN public.customer_waitlist_campaign c ON w.joined_at<=c.started_at WHERE w.user_id=auth.uid() AND public.has_role(auth.uid(),'customer') AND NOT EXISTS(SELECT 1 FROM public.entry_passes e WHERE e.user_id=auth.uid() AND e.status='active' AND e.expires_at>now())));
 END $$;
REVOKE ALL ON FUNCTION public.my_customer_waitlist_invitation() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.my_customer_waitlist_invitation() TO authenticated,service_role;
CREATE FUNCTION public.admin_customer_waitlist_campaign_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator account required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('started',EXISTS(SELECT 1 FROM public.customer_waitlist_campaign),'total',(SELECT count(*) FROM public.customer_launch_waitlist),'sent',(SELECT count(*) FROM public.customer_waitlist_delivery WHERE state='sent'),'failed',(SELECT count(*) FROM public.customer_waitlist_delivery WHERE state IN ('failed','suppressed','no_email')),'pending',(SELECT count(*) FROM public.customer_launch_waitlist w JOIN public.customer_waitlist_campaign c ON w.joined_at<=c.started_at LEFT JOIN public.customer_waitlist_delivery d ON d.user_id=w.user_id WHERE public.has_role(w.user_id,'customer') AND NOT EXISTS(SELECT 1 FROM public.entry_passes e WHERE e.user_id=w.user_id AND e.status='active' AND e.expires_at>now()) AND (d.user_id IS NULL OR d.state IN ('pending','sending'))));
 END $$;
REVOKE ALL ON FUNCTION public.admin_customer_waitlist_campaign_status() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.admin_customer_waitlist_campaign_status() TO authenticated,service_role;
CREATE INDEX customer_waitlist_delivery_state ON public.customer_waitlist_delivery(state,attempted_at);