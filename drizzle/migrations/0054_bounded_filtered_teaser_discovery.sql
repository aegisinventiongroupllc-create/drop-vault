CREATE OR REPLACE FUNCTION public.get_teaser_page(_vault text, _country text DEFAULT NULL, _query text DEFAULT '', _offset integer DEFAULT 0)
RETURNS SETOF public.creator_media LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT m.* FROM public.get_active_teasers() m JOIN public.public_profiles p ON p.user_id=m.creator_id
 LEFT JOIN public.creator_heart_totals h ON h.creator_id=m.creator_id
 WHERE p.vault_side=_vault AND (_country IS NULL OR _country='GLOBAL' OR p.country=_country)
 AND (COALESCE(_query,'')='' OR p.display_name ILIKE '%'||left(_query,100)||'%' OR m.title ILIKE '%'||left(_query,100)||'%' OR EXISTS(SELECT 1 FROM unnest(p.tags) t WHERE t ILIKE '%'||left(_query,100)||'%'))
 ORDER BY COALESCE(h.hearts,0) DESC,m.creator_id LIMIT 24 OFFSET GREATEST(0,_offset);
$$;
REVOKE ALL ON FUNCTION public.get_teaser_page(text,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_teaser_page(text,text,text,integer) TO authenticated;