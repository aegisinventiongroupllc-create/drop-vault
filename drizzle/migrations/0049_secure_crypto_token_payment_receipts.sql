CREATE TABLE public.token_payment_receipts (
 payment_id text PRIMARY KEY,
 order_id text NOT NULL UNIQUE,
 user_id uuid NOT NULL,
 tokens integer NOT NULL CHECK (tokens BETWEEN 1 AND 100),
 amount_usd numeric NOT NULL CHECK (amount_usd = tokens * 25),
 currency text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
 verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.token_payment_receipts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.token_payment_receipts TO service_role;
ALTER TABLE public.token_payment_receipts ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.credit_tokens(_user_id uuid, _payment_id text, _tokens integer, _amount_usd numeric)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE _receipt public.token_payment_receipts; _inserted uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
   RAISE EXCEPTION 'Server payment authorization required' USING ERRCODE='42501';
 END IF;
 IF _user_id IS NULL OR _payment_id IS NULL OR length(trim(_payment_id))=0
    OR _tokens IS NULL OR _tokens NOT BETWEEN 1 AND 100 OR _amount_usd IS DISTINCT FROM (_tokens*25)::numeric THEN
   RAISE EXCEPTION 'Invalid token payment' USING ERRCODE='22023';
 END IF;
 -- The server-validated CCBill path is unchanged; crypto always needs a receipt.
 IF _payment_id NOT LIKE 'ccbill-%' THEN
   SELECT * INTO _receipt FROM public.token_payment_receipts WHERE payment_id=_payment_id FOR UPDATE;
   IF _receipt.payment_id IS NULL OR _receipt.verified_at IS NULL
      OR _receipt.user_id IS DISTINCT FROM _user_id OR _receipt.tokens IS DISTINCT FROM _tokens
      OR _receipt.amount_usd IS DISTINCT FROM _amount_usd OR _receipt.currency IS DISTINCT FROM 'USD' THEN
     RAISE EXCEPTION 'Verified matching token payment required' USING ERRCODE='42501';
   END IF;
 END IF;
 INSERT INTO public.token_purchases
 (user_id,payment_id,tokens_credited,amount_usd,status,package_type,platform_fee_collected,tokens_remaining)
 VALUES (_user_id,_payment_id,_tokens,_amount_usd,'finished',CASE WHEN _tokens=5 THEN '5_tokens' WHEN _tokens=1 THEN '1_token' ELSE 'custom' END,1,_tokens)
 ON CONFLICT (payment_id) DO NOTHING RETURNING id INTO _inserted;
 IF _inserted IS NULL THEN RETURN false; END IF;
 INSERT INTO public.token_balances(user_id,balance,updated_at) VALUES(_user_id,_tokens,now())
 ON CONFLICT(user_id) DO UPDATE SET balance=public.token_balances.balance+EXCLUDED.balance,updated_at=now();
 RETURN true;
END;
$function$;
REVOKE ALL ON FUNCTION public.credit_tokens(uuid,text,integer,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_tokens(uuid,text,integer,numeric) TO service_role;