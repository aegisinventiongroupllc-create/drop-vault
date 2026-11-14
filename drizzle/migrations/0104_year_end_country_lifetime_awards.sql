CREATE TABLE public.year_end_award_reviews (
 award_year integer PRIMARY KEY CHECK (award_year >= 2026), cutoff_at timestamptz NOT NULL,
 prepared_at timestamptz NOT NULL DEFAULT now(), prepared_by uuid NOT NULL, excluded_country_count integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.year_end_award_reviews TO authenticated;
GRANT ALL ON public.year_end_award_reviews TO service_role;
ALTER TABLE public.year_end_award_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_reads_award_reviews ON public.year_end_award_reviews FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TABLE public.year_end_award_candidates (
 award_year integer NOT NULL REFERENCES public.year_end_award_reviews(award_year), country text NOT NULL,
 creator_id uuid NOT NULL, display_name text, followers bigint NOT NULL CHECK (followers > 0),
 PRIMARY KEY (award_year,country,creator_id)
);
GRANT SELECT ON public.year_end_award_candidates TO authenticated;
GRANT ALL ON public.year_end_award_candidates TO service_role;
ALTER TABLE public.year_end_award_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_reads_award_candidates ON public.year_end_award_candidates FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TABLE public.creator_lifetime_awards (
 award_year integer NOT NULL, country text NOT NULL, creator_id uuid NOT NULL, followers bigint NOT NULL,
 confirmed_by uuid NOT NULL, confirmed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (award_year,country),
 FOREIGN KEY (award_year,country,creator_id) REFERENCES public.year_end_award_candidates(award_year,country,creator_id)
);
GRANT SELECT ON public.creator_lifetime_awards TO authenticated;
GRANT ALL ON public.creator_lifetime_awards TO service_role;
ALTER TABLE public.creator_lifetime_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY authorized_reads_lifetime_awards ON public.creator_lifetime_awards FOR SELECT TO authenticated USING (creator_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX lifetime_award_creator ON public.creator_lifetime_awards(creator_id);
CREATE INDEX paid_follower_year_end ON public.creator_paid_followers(creator_id,first_paid_at);
CREATE FUNCTION public.prepare_year_end_awards(_year integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cutoff timestamptz; excluded integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator account required' USING ERRCODE='42501'; END IF;
 IF _year IS NULL OR _year < 2026 OR _year >= extract(year from now() AT TIME ZONE 'UTC') THEN RAISE EXCEPTION 'Only completed years from 2026 can be reviewed'; END IF;
 cutoff:=make_timestamptz(_year+1,1,1,0,0,0,'UTC');
 PERFORM pg_advisory_xact_lock(9505,_year);
 IF EXISTS(SELECT 1 FROM public.year_end_award_reviews WHERE award_year=_year) THEN RETURN jsonb_build_object('already_prepared',true); END IF;
 SELECT count(*) INTO excluded FROM public.profiles p WHERE public.has_role(p.user_id,'creator') AND EXISTS(SELECT 1 FROM public.creator_paid_followers f WHERE f.creator_id=p.user_id AND f.first_paid_at<cutoff) AND NOT EXISTS(SELECT 1 FROM public.creator_verifications v WHERE v.user_id=p.user_id AND v.status='approved' AND v.identity_confirmed AND v.residence_id_confirmed AND v.residence_reviewed_by IS NOT NULL AND v.residence_reviewed_at<cutoff AND v.reviewed_at<cutoff AND v.residence_country ~ '^[A-Z]{2}$');
 INSERT INTO public.year_end_award_reviews(award_year,cutoff_at,prepared_by,excluded_country_count) VALUES(_year,cutoff,auth.uid(),excluded);
 WITH eligible AS (
  SELECT p.user_id,p.display_name,v.residence_country AS country FROM public.profiles p
  JOIN LATERAL (SELECT x.residence_country FROM public.creator_verifications x WHERE x.user_id=p.user_id AND x.status='approved' AND x.identity_confirmed AND x.residence_id_confirmed AND x.residence_reviewed_by IS NOT NULL AND x.residence_reviewed_at<cutoff AND x.reviewed_at<cutoff AND x.document_expires_on >= (cutoff AT TIME ZONE 'UTC')::date-1 ORDER BY x.reviewed_at DESC,x.id LIMIT 1) v ON true
  WHERE public.has_role(p.user_id,'creator') AND p.created_at<cutoff AND v.residence_country ~ '^[A-Z]{2}$'
   AND v.residence_country <> ALL(ARRAY['CU','IR','KP','SY','RU','BY','VE','MM','AF','BD','BT','BN','CN','EG','IN','ID','IQ','JO','KW','LB','LY','MY','MV','MA','NP','OM','PK','QA','SA','SG','SO','LK','SD','TN','TR','TM','AE','UZ','VN','YE','KR','PH','NG','JP','ZA'])
   AND NOT EXISTS(SELECT 1 FROM public.account_bans b WHERE b.user_id=p.user_id)
   AND NOT EXISTS(SELECT 1 FROM public.creator_consent_withdrawals w WHERE w.creator_id=p.user_id)
 ), totals AS (
  SELECT e.user_id,e.display_name,e.country,count(f.customer_id) AS followers FROM eligible e JOIN public.creator_paid_followers f ON f.creator_id=e.user_id AND f.first_paid_at<cutoff GROUP BY e.user_id,e.display_name,e.country
 ), ranked AS (SELECT *,dense_rank() OVER (PARTITION BY country ORDER BY followers DESC) AS position FROM totals)
 INSERT INTO public.year_end_award_candidates(award_year,country,creator_id,display_name,followers) SELECT _year,country,user_id,display_name,followers FROM ranked WHERE position=1 AND followers>0;
 RETURN jsonb_build_object('already_prepared',false,'excluded_country_count',excluded);
END $$;
REVOKE ALL ON FUNCTION public.prepare_year_end_awards(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.prepare_year_end_awards(integer) TO authenticated;
CREATE FUNCTION public.confirm_year_end_award(_year integer,_country text,_creator uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE candidate public.year_end_award_candidates; existing public.creator_lifetime_awards;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator account required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(9505,_year);
 SELECT * INTO candidate FROM public.year_end_award_candidates WHERE award_year=_year AND country=_country AND creator_id=_creator;
 IF NOT FOUND THEN RAISE EXCEPTION 'Creator is not a year-end country leader'; END IF;
 SELECT * INTO existing FROM public.creator_lifetime_awards WHERE award_year=_year AND country=_country;
 IF FOUND THEN
  IF existing.creator_id=_creator THEN RETURN jsonb_build_object('already_confirmed',true); END IF;
  RAISE EXCEPTION 'This country already has a confirmed winner for this year';
 END IF;
 IF auth.uid()=_creator THEN RAISE EXCEPTION 'An independent administrator must confirm this award' USING ERRCODE='42501'; END IF;
 IF NOT public.has_role(_creator,'creator') OR EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=_creator) OR EXISTS(SELECT 1 FROM public.creator_consent_withdrawals WHERE creator_id=_creator) OR NOT EXISTS(SELECT 1 FROM public.creator_verifications WHERE user_id=_creator AND status='approved' AND identity_confirmed) THEN RAISE EXCEPTION 'Creator is no longer eligible for an award'; END IF;
 INSERT INTO public.creator_lifetime_awards(award_year,country,creator_id,followers,confirmed_by) VALUES(_year,_country,_creator,candidate.followers,auth.uid());
 RETURN jsonb_build_object('already_confirmed',false,'vault_percent',95);
END $$;
REVOKE ALL ON FUNCTION public.confirm_year_end_award(integer,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_year_end_award(integer,text,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.creator_split_percent(_creator_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT CASE
  WHEN EXISTS(SELECT 1 FROM public.creator_lifetime_awards a WHERE a.creator_id=_creator_id) THEN 95
  WHEN EXISTS(SELECT 1 FROM public.creator_split_settings s WHERE s.creator_id=_creator_id AND s.vip_pass_purchased='ELITE_PASS') THEN 93
  WHEN EXISTS(SELECT 1 FROM public.creator_split_settings s WHERE s.creator_id=_creator_id AND s.vip_pass_purchased='PRO_PASS') THEN 92
  WHEN EXISTS(SELECT 1 FROM public.power_weeks w WHERE w.creator_id=_creator_id AND w.active AND w.started_at<=now() AND w.ends_at>now()) THEN 92
  ELSE GREATEST(90, COALESCE((SELECT LEAST(92,f.split_creator) FROM public.founding_creators f WHERE f.creator_id=_creator_id AND f.ends_at>now()),90))
 END
$$;
REVOKE EXECUTE ON FUNCTION public.creator_split_percent(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.creator_split_percent(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.get_my_revenue_terms()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('vault_percent',public.creator_split_percent(auth.uid()),'request_percent',public.creator_request_split_percent(auth.uid()),
 'lifetime_award',EXISTS(SELECT 1 FROM public.creator_lifetime_awards WHERE creator_id=auth.uid()),
 'vip_pass',COALESCE((SELECT vip_pass_purchased::text FROM public.creator_split_settings WHERE creator_id=auth.uid()),'NONE'),
 'power_week_expires_at',CASE WHEN EXISTS(SELECT 1 FROM public.creator_lifetime_awards WHERE creator_id=auth.uid()) OR EXISTS(SELECT 1 FROM public.creator_split_settings WHERE creator_id=auth.uid() AND vip_pass_purchased<>'NONE') THEN NULL
 ELSE (SELECT max(ends_at) FROM public.power_weeks WHERE creator_id=auth.uid() AND active AND started_at<=now() AND ends_at>now()) END) WHERE auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.get_my_revenue_terms() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_revenue_terms() TO authenticated;