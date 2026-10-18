CREATE OR REPLACE FUNCTION public.search_creator_page(_query text,_vault text DEFAULT NULL,_countries text[] DEFAULT '{}',_offset integer DEFAULT 0)
RETURNS SETOF public.public_profiles LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT p.* FROM public.public_profiles p WHERE p.role='creator' AND (_vault IS NULL OR p.vault_side=_vault)
 AND (p.display_name ILIKE '%'||left(_query,100)||'%' OR p.country=ANY(_countries) OR EXISTS(SELECT 1 FROM unnest(p.tags) t WHERE t ILIKE '%'||left(_query,100)||'%'))
 ORDER BY p.user_id LIMIT 25 OFFSET GREATEST(0,_offset);
$$;
REVOKE ALL ON FUNCTION public.search_creator_page(text,text,text[],integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.search_creator_page(text,text,text[],integer) TO authenticated;