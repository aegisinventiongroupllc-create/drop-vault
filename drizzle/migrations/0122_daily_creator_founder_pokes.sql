CREATE TABLE public.creator_founder_pokes (creator_id uuid NOT NULL, poke_day date NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(creator_id,poke_day));
GRANT SELECT ON public.creator_founder_pokes TO authenticated;
GRANT ALL ON public.creator_founder_pokes TO service_role;
REVOKE ALL ON public.creator_founder_pokes FROM anon;
REVOKE INSERT,UPDATE,DELETE ON public.creator_founder_pokes FROM authenticated;
ALTER TABLE public.creator_founder_pokes ENABLE ROW LEVEL SECURITY;
CREATE POLICY creator_poke_read ON public.creator_founder_pokes FOR SELECT TO authenticated USING(creator_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX creator_pokes_day ON public.creator_founder_pokes(poke_day,creator_id);
CREATE FUNCTION public.my_founder_poke(_send boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE d date := (now() AT TIME ZONE 'America/New_York')::date; received timestamptz; n integer; BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'creator') THEN RAISE EXCEPTION 'Creator account required' USING ERRCODE='42501'; END IF;
 IF _send THEN INSERT INTO public.creator_founder_pokes(creator_id,poke_day) VALUES(auth.uid(),d) ON CONFLICT DO NOTHING; END IF;
 SELECT received_at INTO received FROM public.creator_founder_pokes WHERE creator_id=auth.uid() AND poke_day=d;
 SELECT count(*) INTO n FROM public.creator_founder_pokes WHERE creator_id=auth.uid() AND poke_day BETWEEN d-364 AND d;
 RETURN jsonb_build_object('received_at',received,'day',d,'days',n,'next_day_at',((d+1)::timestamp AT TIME ZONE 'America/New_York'));
END; $$;
REVOKE ALL ON FUNCTION public.my_founder_poke(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_founder_poke(boolean) TO authenticated,service_role;
CREATE FUNCTION public.admin_founder_poke_top_ten(_end_day date DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE d date:=coalesce(_end_day,(now() AT TIME ZONE 'America/New_York')::date); BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator account required' USING ERRCODE='42501'; END IF;
 IF d>(now() AT TIME ZONE 'America/New_York')::date THEN RAISE EXCEPTION 'Future dates are unavailable'; END IF;
 RETURN jsonb_build_object('start_day',d-364,'end_day',d,'today_total',(SELECT count(*) FROM public.creator_founder_pokes WHERE poke_day=d),'entries',(SELECT coalesce(jsonb_agg(x ORDER BY x.days DESC,x.latest_day DESC,x.creator_id),'[]'::jsonb) FROM (SELECT a.creator_id,a.days,a.latest_day,p.display_name,p.email,p.country FROM (SELECT creator_id,count(*)::integer AS days,max(poke_day) AS latest_day FROM public.creator_founder_pokes WHERE poke_day BETWEEN d-364 AND d GROUP BY creator_id ORDER BY count(*) DESC,max(poke_day) DESC,creator_id LIMIT 10) a LEFT JOIN public.profiles p ON p.user_id=a.creator_id) x));
END; $$;
REVOKE ALL ON FUNCTION public.admin_founder_poke_top_ten(date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_founder_poke_top_ten(date) TO authenticated,service_role;