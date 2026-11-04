CREATE OR REPLACE FUNCTION public.token_bundle_total(_tokens integer)
RETURNS numeric LANGUAGE sql IMMUTABLE STRICT SET search_path=public
AS $$ SELECT CASE WHEN _tokens BETWEEN 1 AND 100 THEN ((_tokens / 10) * 230 + ((_tokens % 10) / 5) * 120 + (_tokens % 5) * 25)::numeric ELSE NULL END $$;
REVOKE ALL ON FUNCTION public.token_bundle_total(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.token_bundle_total(integer) TO service_role;
ALTER TABLE public.token_payment_receipts DROP CONSTRAINT token_payment_receipts_check;
ALTER TABLE public.token_payment_receipts ADD CONSTRAINT token_payment_receipts_check CHECK (amount_usd = (tokens * 25)::numeric OR amount_usd = public.token_bundle_total(tokens));
DO $change$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.credit_tokens(uuid,text,integer,numeric)'::regprocedure) INTO definition;
 IF position('_amount_usd IS DISTINCT FROM (_tokens*25)::numeric' IN definition)=0 THEN
   RAISE EXCEPTION 'Unexpected token credit definition';
 END IF;
 definition := replace(definition, '_amount_usd IS DISTINCT FROM (_tokens*25)::numeric', '(_amount_usd IS DISTINCT FROM (_tokens*25)::numeric AND _amount_usd IS DISTINCT FROM public.token_bundle_total(_tokens))');
 EXECUTE definition;
END $change$;
REVOKE EXECUTE ON FUNCTION public.credit_tokens(uuid,text,integer,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_tokens(uuid,text,integer,numeric) TO service_role;