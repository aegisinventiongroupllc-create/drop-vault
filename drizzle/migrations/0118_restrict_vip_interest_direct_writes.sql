REVOKE ALL ON public.creator_vip_interest FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.creator_vip_interest FROM authenticated;
REVOKE ALL ON SEQUENCE public.creator_vip_interest_id_seq FROM anon,authenticated;
GRANT SELECT ON public.creator_vip_interest TO authenticated;