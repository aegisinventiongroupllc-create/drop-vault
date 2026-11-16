ALTER TABLE public.profiles DROP CONSTRAINT profiles_vault_side_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_vault_side_check CHECK(vault_side IN ('women','men','trans_women','trans_men'));
ALTER TABLE public.account_preferences DROP CONSTRAINT account_preferences_customer_preference_check;
ALTER TABLE public.account_preferences ADD CONSTRAINT account_preferences_customer_preference_check CHECK(customer_preference IS NULL OR customer_preference IN ('women','men','both','trans_women','trans_men'));
CREATE OR REPLACE FUNCTION public.search_creator_page(_query text, _vault text DEFAULT NULL, _countries text[] DEFAULT '{}', _offset integer DEFAULT 0)
RETURNS SETOF public.public_profiles LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT p.* FROM public.public_profiles p WHERE p.role='creator' AND ((COALESCE(_vault,'both')='both' AND p.vault_side IN ('women','men')) OR p.vault_side=_vault)
 AND (p.display_name ILIKE '%'||left(_query,100)||'%' OR p.country=ANY(_countries) OR EXISTS(SELECT 1 FROM unnest(p.tags) t WHERE t ILIKE '%'||left(_query,100)||'%'))
 ORDER BY (public.get_creator_vip_status(p.user_id)->>'priority_active')::boolean DESC,p.user_id LIMIT 25 OFFSET GREATEST(0,_offset)
$$;