CREATE OR REPLACE FUNCTION public.unlock_creator_year(_creator_id uuid)
RETURNS public.subscriptions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.subscriptions; i integer; bal integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT balance INTO bal FROM public.token_balances WHERE user_id=auth.uid() FOR UPDATE;
 IF COALESCE(bal,0) < 26 THEN RAISE EXCEPTION 'INSUFFICIENT_TOKENS'; END IF;
 FOR i IN 1..26 LOOP r := public.unlock_creator(_creator_id); END LOOP;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.unlock_creator_year(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unlock_creator_year(uuid) TO authenticated;