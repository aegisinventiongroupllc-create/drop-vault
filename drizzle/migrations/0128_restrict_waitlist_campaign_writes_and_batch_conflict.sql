REVOKE INSERT,UPDATE,DELETE ON public.customer_waitlist_campaign,public.customer_waitlist_delivery FROM authenticated;
CREATE OR REPLACE FUNCTION public.customer_waitlist_campaign_batch() RETURNS TABLE(user_id uuid,email text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server authorization required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(73662901);
 RETURN QUERY WITH candidates AS (
 SELECT w.user_id,p.email FROM public.customer_launch_waitlist w JOIN public.customer_waitlist_campaign c ON w.joined_at<=c.started_at LEFT JOIN public.profiles p ON p.user_id=w.user_id LEFT JOIN public.customer_waitlist_delivery d ON d.user_id=w.user_id
 WHERE public.has_role(w.user_id,'customer') AND NOT EXISTS(SELECT 1 FROM public.entry_passes e WHERE e.user_id=w.user_id AND e.status='active' AND e.expires_at>now()) AND (d.user_id IS NULL OR d.state='pending' OR (d.state='sending' AND d.attempted_at<now()-interval '5 minutes')) ORDER BY w.joined_at,w.user_id LIMIT 25
 ), claimed AS (INSERT INTO public.customer_waitlist_delivery(user_id,state,attempted_at) SELECT candidates.user_id,'sending',now() FROM candidates ON CONFLICT ON CONSTRAINT customer_waitlist_delivery_pkey DO UPDATE SET state='sending',attempted_at=now() RETURNING customer_waitlist_delivery.user_id)
 SELECT candidates.user_id,candidates.email FROM candidates JOIN claimed ON claimed.user_id=candidates.user_id;
 END $$;
REVOKE ALL ON FUNCTION public.customer_waitlist_campaign_batch() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.customer_waitlist_campaign_batch() TO service_role;