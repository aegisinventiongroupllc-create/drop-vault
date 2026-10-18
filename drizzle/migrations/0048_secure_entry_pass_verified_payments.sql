CREATE TABLE public.entry_pass_payment_receipts (
  payment_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  order_id text NOT NULL UNIQUE,
  method text NOT NULL CHECK (method IN ('crypto','card')),
  amount_usd numeric NOT NULL CHECK (amount_usd = 20),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.entry_pass_payment_receipts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.entry_pass_payment_receipts TO service_role;
ALTER TABLE public.entry_pass_payment_receipts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.credit_entry_pass(_user_id uuid, _payment_id text, _amount_usd numeric, _method text DEFAULT 'crypto')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE _receipt public.entry_pass_payment_receipts; _expires timestamptz; _inserted uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Server payment authorization required' USING ERRCODE = '42501';
  END IF;
  IF _user_id IS NULL OR _payment_id IS NULL OR length(trim(_payment_id)) = 0
     OR _amount_usd IS DISTINCT FROM 20::numeric OR _method IS NULL OR _method NOT IN ('crypto','card') THEN
    RAISE EXCEPTION 'Invalid entry-pass payment' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO _receipt FROM public.entry_pass_payment_receipts WHERE payment_id = _payment_id FOR UPDATE;
  IF _receipt.payment_id IS NULL OR _receipt.verified_at IS NULL
     OR _receipt.user_id IS DISTINCT FROM _user_id OR _receipt.amount_usd IS DISTINCT FROM _amount_usd
     OR _receipt.method IS DISTINCT FROM _method OR _receipt.currency IS DISTINCT FROM 'USD' THEN
    RAISE EXCEPTION 'Verified matching payment required' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.entry_passes WHERE payment_id = _payment_id) THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text, 0));
  SELECT max(expires_at) INTO _expires FROM public.entry_passes
  WHERE user_id = _user_id AND status = 'active' AND expires_at > now();
  INSERT INTO public.entry_passes(user_id,payment_id,amount_usd,method,expires_at)
  VALUES (_user_id,_payment_id,_amount_usd,_method,GREATEST(coalesce(_expires,now()),now()) + interval '365 days')
  ON CONFLICT (payment_id) DO NOTHING RETURNING id INTO _inserted;
  RETURN _inserted IS NOT NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.credit_entry_pass(uuid,text,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_entry_pass(uuid,text,numeric,text) TO service_role;
COMMENT ON FUNCTION public.credit_entry_pass(uuid,text,numeric,text) IS 'Service-role only; requires a matching verified payment receipt. Never call from the browser.';