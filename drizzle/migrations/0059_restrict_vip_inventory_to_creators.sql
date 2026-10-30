DROP POLICY IF EXISTS "Anyone reads pass inventory" ON public.vip_pass_inventory;
REVOKE ALL ON public.vip_pass_inventory FROM anon;
GRANT SELECT ON public.vip_pass_inventory TO authenticated;
GRANT ALL ON public.vip_pass_inventory TO service_role;
CREATE POLICY "Creators read VIP inventory" ON public.vip_pass_inventory FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'creator'::public.app_role));