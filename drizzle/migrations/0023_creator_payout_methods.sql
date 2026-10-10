CREATE TABLE public.creator_payout_methods (
  user_id uuid PRIMARY KEY,
  method text NOT NULL CHECK (method IN ('ach','ltc')),
  account_holder text,
  bank_name text,
  routing_number text,
  account_number text,
  account_type text CHECK (account_type IN ('checking','savings')),
  ltc_address text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.creator_payout_methods TO service_role;
ALTER TABLE public.creator_payout_methods ENABLE ROW LEVEL SECURITY;
-- No client policies: creators use the functions below; admin reads via backend only.

CREATE OR REPLACE FUNCTION public.get_my_payout_method()
RETURNS TABLE(method text, account_holder text, bank_name text, routing_last4 text, account_last4 text, account_type text, ltc_address text, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT method, account_holder, bank_name, right(routing_number,4), right(account_number,4), account_type, ltc_address, updated_at
  FROM public.creator_payout_methods WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.set_my_payout_method(_method text, _account_holder text, _bank_name text, _routing text, _account text, _account_type text, _ltc text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); d int[]; s int;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid,'creator') THEN RAISE EXCEPTION 'Creator account required'; END IF;
  IF _method = 'ach' THEN
    IF _routing !~ '^[0-9]{9}$' THEN RAISE EXCEPTION 'Routing number must be 9 digits'; END IF;
    SELECT array_agg(substr(_routing,i,1)::int ORDER BY i) INTO d FROM generate_series(1,9) i;
    s := 3*(d[1]+d[4]+d[7]) + 7*(d[2]+d[5]+d[8]) + (d[3]+d[6]+d[9]);
    IF s % 10 <> 0 THEN RAISE EXCEPTION 'Routing number is not valid'; END IF;
    IF _account !~ '^[0-9]{4,17}$' THEN RAISE EXCEPTION 'Account number must be 4-17 digits'; END IF;
    IF coalesce(length(trim(_account_holder)),0) < 2 OR length(_account_holder) > 120 THEN RAISE EXCEPTION 'Account holder name required'; END IF;
    IF _account_type NOT IN ('checking','savings') THEN RAISE EXCEPTION 'Choose checking or savings'; END IF;
    INSERT INTO public.creator_payout_methods (user_id, method, account_holder, bank_name, routing_number, account_number, account_type, ltc_address, updated_at)
    VALUES (_uid,'ach',trim(_account_holder),left(trim(coalesce(_bank_name,'')),120),_routing,_account,_account_type,NULL,now())
    ON CONFLICT (user_id) DO UPDATE SET method='ach', account_holder=EXCLUDED.account_holder, bank_name=EXCLUDED.bank_name,
      routing_number=EXCLUDED.routing_number, account_number=EXCLUDED.account_number, account_type=EXCLUDED.account_type, ltc_address=NULL, updated_at=now();
  ELSIF _method = 'ltc' THEN
    IF _ltc !~ '^(ltc1[a-z0-9]{20,80}|[LM3][a-km-zA-HJ-NP-Z1-9]{25,40})$' THEN RAISE EXCEPTION 'Invalid LTC address'; END IF;
    INSERT INTO public.creator_payout_methods (user_id, method, ltc_address, updated_at) VALUES (_uid,'ltc',_ltc,now())
    ON CONFLICT (user_id) DO UPDATE SET method='ltc', ltc_address=EXCLUDED.ltc_address, account_holder=NULL, bank_name=NULL,
      routing_number=NULL, account_number=NULL, account_type=NULL, updated_at=now();
    INSERT INTO public.creator_wallets (user_id, ltc_address) VALUES (_uid,_ltc)
    ON CONFLICT (user_id) DO UPDATE SET ltc_address=EXCLUDED.ltc_address, updated_at=now();
  ELSE RAISE EXCEPTION 'Invalid method'; END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.get_my_payout_method() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_my_payout_method(text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_payout_method() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_payout_method(text,text,text,text,text,text,text) TO authenticated;