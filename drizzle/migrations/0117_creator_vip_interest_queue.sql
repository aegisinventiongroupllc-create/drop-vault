CREATE TABLE public.creator_vip_interest (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 creator_id uuid NOT NULL UNIQUE,
 pass_type public.vip_pass_type NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT creator_vip_interest_valid_pass CHECK (pass_type IN ('PRO_PASS','ELITE_PASS'))
);
GRANT SELECT ON public.creator_vip_interest TO authenticated;
GRANT ALL ON public.creator_vip_interest TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.creator_vip_interest_id_seq TO service_role;
ALTER TABLE public.creator_vip_interest ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_creator_vip_interest ON public.creator_vip_interest FOR SELECT TO authenticated USING (creator_id=auth.uid() AND public.has_role(auth.uid(),'creator'));
CREATE OR REPLACE FUNCTION public.my_vip_interest(_action text DEFAULT 'status', _pass public.vip_pass_type DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := auth.uid(); r public.creator_vip_interest; n integer;
BEGIN
 IF u IS NULL OR NOT public.has_role(u,'creator') OR EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=u) OR EXISTS(SELECT 1 FROM public.creator_consent_withdrawals WHERE creator_id=u) THEN RAISE EXCEPTION 'Eligible creator required' USING ERRCODE='42501'; END IF;
 IF _action NOT IN ('status','join','leave') OR _action IS NULL THEN RAISE EXCEPTION 'Invalid action'; END IF;
 IF _action <> 'status' THEN
  PERFORM pg_advisory_xact_lock(72460127);
  IF _action='leave' THEN
   DELETE FROM public.creator_vip_interest WHERE creator_id=u;
  ELSE
   IF _pass IS NULL OR _pass NOT IN ('PRO_PASS','ELITE_PASS') THEN RAISE EXCEPTION 'Select Pro or Elite'; END IF;
   IF EXISTS(SELECT 1 FROM public.creator_split_settings WHERE creator_id=u AND vip_pass_purchased<>'NONE') THEN RAISE EXCEPTION 'VIP pass already owned'; END IF;
   SELECT * INTO r FROM public.creator_vip_interest WHERE creator_id=u;
   SELECT count(*) INTO n FROM public.creator_vip_interest;
   IF r.id IS NULL AND n>=1000 THEN RAISE EXCEPTION 'VIP waiting list is full'; END IF;
   INSERT INTO public.creator_vip_interest(creator_id,pass_type) VALUES(u,_pass) ON CONFLICT(creator_id) DO UPDATE SET pass_type=EXCLUDED.pass_type;
  END IF;
 END IF;
 SELECT * INTO r FROM public.creator_vip_interest WHERE creator_id=u;
 SELECT count(*) INTO n FROM public.creator_vip_interest;
 RETURN jsonb_build_object('capacity',1000,'joined',n,'entry',CASE WHEN r.id IS NULL THEN NULL ELSE jsonb_build_object('pass_type',r.pass_type,'position',(SELECT count(*) FROM public.creator_vip_interest WHERE id<=r.id)) END);
END $$;
REVOKE ALL ON FUNCTION public.my_vip_interest(text,public.vip_pass_type) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_vip_interest(text,public.vip_pass_type) TO authenticated;
COMMENT ON TABLE public.creator_vip_interest IS 'Private nonbinding creator interest only. Never reserves VIP inventory or authorizes VIP grants.';