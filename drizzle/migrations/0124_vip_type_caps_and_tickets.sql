-- Preserve existing authorization, receipt matching and the shared inventory lock.
DO $$
DECLARE definition text; old text;
BEGIN
 definition := pg_get_functiondef('public.reserve_vip_checkout(uuid,public.vip_pass_type)'::regprocedure);
 old := 'INSERT INTO public.vip_pass_checkouts(creator_id,pass_type,amount_usd)';
 IF strpos(definition,old)=0 THEN RAISE EXCEPTION 'Unexpected reservation definition'; END IF;
 definition := replace(definition,old,$guard$
 IF (SELECT count(*) FROM public.vip_pass_payment_receipts WHERE pass_type=_pass AND applied_at IS NOT NULL)
  + (SELECT count(*) FROM public.vip_pass_checkouts WHERE pass_type=_pass AND status IN ('reserved','invoiced')) >= 500
 THEN RAISE EXCEPTION 'This VIP pass type is sold out'; END IF;
 INSERT INTO public.vip_pass_checkouts(creator_id,pass_type,amount_usd)$guard$);
 EXECUTE definition;
 definition := pg_get_functiondef('public.apply_verified_vip_pass(text)'::regprocedure);
 old := 'INSERT INTO public.creator_split_settings(creator_id,creator_split_tier';
 IF strpos(definition,old)=0 THEN RAISE EXCEPTION 'Unexpected grant definition'; END IF;
 definition := replace(definition,old,$guard$
 IF (SELECT count(*) FROM public.vip_pass_payment_receipts WHERE pass_type=r.pass_type AND applied_at IS NOT NULL) >= 500
 THEN RAISE EXCEPTION 'This VIP pass type is sold out'; END IF;
 INSERT INTO public.creator_split_settings(creator_id,creator_split_tier$guard$);
 EXECUTE definition;
 definition := pg_get_functiondef('public.my_vip_interest(text,public.vip_pass_type)'::regprocedure);
 old := '''pass_type'',r.pass_type,''position''';
 IF strpos(definition,old)=0 THEN RAISE EXCEPTION 'Unexpected interest definition'; END IF;
 definition := replace(definition,old,'''ticket_id'',r.id::text,''joined_at'',r.created_at,''pass_type'',r.pass_type,''position''');
 EXECUTE definition;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_vip_store()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cap integer; sold integer; held integer; c public.vip_pass_checkouts; types jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(),'creator') OR EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=auth.uid()) OR EXISTS(SELECT 1 FROM public.creator_consent_withdrawals WHERE creator_id=auth.uid()) THEN RAISE EXCEPTION 'Eligible creator required' USING ERRCODE='42501'; END IF;
 SELECT LEAST(total_passes_cap,1000),passes_sold INTO cap,sold FROM public.vip_pass_inventory WHERE id=true;
 SELECT count(*) INTO held FROM public.vip_pass_checkouts WHERE status='invoiced' OR (status='reserved' AND (invoice_started_at IS NOT NULL OR expires_at>now()));
 SELECT * INTO c FROM public.vip_pass_checkouts WHERE creator_id=auth.uid() AND (status='invoiced' OR (status='reserved' AND (invoice_started_at IS NOT NULL OR expires_at>now()))) ORDER BY created_at DESC LIMIT 1;
 SELECT jsonb_object_agg(pass,jsonb_build_object('cap',500,'sold',paid,'remaining',GREATEST(0,LEAST(500-paid-reserved,cap-sold-held)))) INTO types FROM (
 SELECT pass,
 (SELECT count(*) FROM public.vip_pass_payment_receipts r WHERE r.pass_type=pass AND r.applied_at IS NOT NULL) paid,
 (SELECT count(*) FROM public.vip_pass_checkouts v WHERE v.pass_type=pass AND (v.status='invoiced' OR (v.status='reserved' AND (v.invoice_started_at IS NOT NULL OR v.expires_at>now())))) reserved
 FROM unnest(ARRAY['PRO_PASS','ELITE_PASS']::public.vip_pass_type[]) pass) s;
 RETURN jsonb_build_object('cap',cap,'sold',sold,'remaining',GREATEST(0,cap-sold-held),'by_type',types,'owned',COALESCE((SELECT vip_pass_purchased FROM public.creator_split_settings WHERE creator_id=auth.uid()),'NONE'),'checkout',CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object('id',c.id,'pass_type',c.pass_type,'status',c.status,'invoice_url',c.invoice_url,'expires_at',c.expires_at) END);
END $$;

CREATE OR REPLACE FUNCTION public.admin_vip_launch_list(_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501'; END IF;
 IF _offset IS NULL OR _offset<0 THEN RAISE EXCEPTION 'Invalid offset'; END IF;
 WITH members AS (
 SELECT i.creator_id, i.id::text ticket_id, i.pass_type, i.created_at joined_at,
 row_number() OVER(ORDER BY i.id) position,
 COALESCE(s.vip_pass_purchased,'NONE'::public.vip_pass_type) owned
 FROM public.creator_vip_interest i LEFT JOIN public.creator_split_settings s USING(creator_id)
 UNION ALL
 SELECT s.creator_id,NULL,s.vip_pass_purchased,s.vip_pass_purchased_at,NULL,s.vip_pass_purchased
 FROM public.creator_split_settings s WHERE s.vip_pass_purchased<>'NONE' AND NOT EXISTS(SELECT 1 FROM public.creator_vip_interest i WHERE i.creator_id=s.creator_id)
 ), page AS (
 SELECT m.*,p.display_name,p.email,p.country FROM members m LEFT JOIN public.profiles p ON p.user_id=m.creator_id
 ORDER BY joined_at,creator_id LIMIT 50 OFFSET _offset
 )
 SELECT jsonb_build_object('total',(SELECT count(*) FROM members),'waiting',(SELECT count(*) FROM public.creator_vip_interest),'pro_paid',(SELECT count(*) FROM public.vip_pass_payment_receipts WHERE pass_type='PRO_PASS' AND applied_at IS NOT NULL),'elite_paid',(SELECT count(*) FROM public.vip_pass_payment_receipts WHERE pass_type='ELITE_PASS' AND applied_at IS NOT NULL),'entries',COALESCE((SELECT jsonb_agg(to_jsonb(page) ORDER BY joined_at,creator_id) FROM page),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_vip_launch_list(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_vip_launch_list(integer) TO authenticated,service_role;
