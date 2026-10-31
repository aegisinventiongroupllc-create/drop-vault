REVOKE ALL ON public.vip_pass_payment_receipts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.vip_pass_payment_receipts TO service_role;