ALTER TABLE public.profiles ADD COLUMN adaptive_tags text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.profiles ADD CONSTRAINT profiles_adaptive_tags_valid CHECK (adaptive_tags <@ ARRAY['adaptive-creator','mobility-aid-wheelchair-user','prosthetic-limb-difference','sensory-inclusive']::text[] AND cardinality(adaptive_tags)<=4 AND array_position(adaptive_tags,NULL) IS NULL);
COMMENT ON COLUMN public.profiles.adaptive_tags IS 'Voluntary public self-description only; no medical verification or founder eligibility.';
CREATE OR REPLACE VIEW public.public_profiles AS SELECT user_id,display_name,country,vault_side,role,created_at,avatar_config,(SELECT cpp.storage_path FROM public.creator_profile_photos cpp WHERE cpp.creator_id=p.user_id AND cpp.is_active LIMIT 1) AS profile_photo_path,tags,CASE WHEN role='creator' THEN adaptive_tags ELSE '{}'::text[] END AS adaptive_tags FROM public.profiles p WHERE role<>'creator' OR verification_status='approved';
CREATE FUNCTION public.save_my_adaptive_tags(_tags text[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'creator') THEN RAISE EXCEPTION 'CREATOR_REQUIRED'; END IF;
IF _tags IS NULL OR NOT (_tags <@ ARRAY['adaptive-creator','mobility-aid-wheelchair-user','prosthetic-limb-difference','sensory-inclusive']::text[]) OR cardinality(_tags)>4 OR array_position(_tags,NULL) IS NOT NULL THEN RAISE EXCEPTION 'INVALID_ADAPTIVE_TAGS'; END IF;
UPDATE public.profiles SET adaptive_tags=ARRAY(SELECT DISTINCT tag FROM unnest(_tags) tag ORDER BY tag),updated_at=now() WHERE user_id=auth.uid();
IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_REQUIRED'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.save_my_adaptive_tags(text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_my_adaptive_tags(text[]) TO authenticated;
CREATE FUNCTION public.search_creator_adaptive(_query text,_categories text[],_adaptive_tags text[],_countries text[] DEFAULT '{}'::text[],_offset integer DEFAULT 0) RETURNS SETOF public.public_profiles LANGUAGE sql STABLE SET search_path=public AS $$
SELECT p.* FROM public.public_profiles p WHERE p.role='creator' AND p.vault_side=ANY(_categories) AND p.adaptive_tags @> _adaptive_tags AND _adaptive_tags <@ ARRAY['adaptive-creator','mobility-aid-wheelchair-user','prosthetic-limb-difference','sensory-inclusive']::text[] AND (coalesce(_query,'')='' OR p.display_name ILIKE '%'||left(_query,100)||'%' OR p.country=ANY(_countries) OR EXISTS(SELECT 1 FROM unnest(p.tags)t WHERE t ILIKE '%'||left(_query,100)||'%')) ORDER BY (public.get_creator_vip_status(p.user_id)->>'priority_active')::boolean DESC,p.user_id LIMIT 25 OFFSET GREATEST(0,_offset)
$$;
REVOKE ALL ON FUNCTION public.search_creator_adaptive(text,text[],text[],text[],integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.search_creator_adaptive(text,text[],text[],text[],integer) TO authenticated;
CREATE FUNCTION public.get_teaser_adaptive(_categories text[],_adaptive_tags text[],_country text DEFAULT NULL,_query text DEFAULT '',_offset integer DEFAULT 0) RETURNS SETOF public.creator_media LANGUAGE sql STABLE SET search_path=public AS $$
SELECT m.* FROM public.get_active_teasers()m JOIN public.public_profiles p ON p.user_id=m.creator_id LEFT JOIN public.creator_heart_totals h ON h.creator_id=m.creator_id WHERE p.vault_side=ANY(_categories) AND p.adaptive_tags @> _adaptive_tags AND _adaptive_tags <@ ARRAY['adaptive-creator','mobility-aid-wheelchair-user','prosthetic-limb-difference','sensory-inclusive']::text[] AND (_country IS NULL OR _country='GLOBAL' OR p.country=_country) AND (COALESCE(_query,'')='' OR p.display_name ILIKE '%'||left(_query,100)||'%' OR m.title ILIKE '%'||left(_query,100)||'%' OR EXISTS(SELECT 1 FROM unnest(p.tags)t WHERE t ILIKE '%'||left(_query,100)||'%')) ORDER BY (public.get_creator_vip_status(m.creator_id)->>'priority_active')::boolean DESC,COALESCE(h.hearts,0) DESC,m.creator_id LIMIT 24 OFFSET GREATEST(0,_offset)
$$;
REVOKE ALL ON FUNCTION public.get_teaser_adaptive(text[],text[],text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_teaser_adaptive(text[],text[],text,text,integer) TO authenticated;
CREATE INDEX profiles_adaptive_tags_idx ON public.profiles USING gin(adaptive_tags);