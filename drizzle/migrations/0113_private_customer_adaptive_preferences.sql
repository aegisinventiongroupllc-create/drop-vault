ALTER TABLE public.account_preferences ADD COLUMN adaptive_preferences text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.account_preferences ADD CONSTRAINT account_adaptive_preferences_valid CHECK (adaptive_preferences <@ ARRAY['adaptive-creator','mobility-aid-wheelchair-user','prosthetic-limb-difference','sensory-inclusive']::text[] AND array_position(adaptive_preferences,NULL) IS NULL);
CREATE FUNCTION public.save_my_browsing_preferences(_categories text[], _adaptive_tags text[]) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE categories text[]; tags text[];
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'SIGN_IN_REQUIRED'; END IF;
 IF _categories IS NULL OR NOT (_categories <@ ARRAY['women','men','trans_women','trans_men']::text[]) OR array_position(_categories,NULL) IS NOT NULL THEN RAISE EXCEPTION 'INVALID_CATEGORIES'; END IF;
 IF _adaptive_tags IS NULL OR NOT (_adaptive_tags <@ ARRAY['adaptive-creator','mobility-aid-wheelchair-user','prosthetic-limb-difference','sensory-inclusive']::text[]) OR array_position(_adaptive_tags,NULL) IS NOT NULL THEN RAISE EXCEPTION 'INVALID_ADAPTIVE_TAGS'; END IF;
 SELECT coalesce(array_agg(DISTINCT c ORDER BY c),'{}') INTO categories FROM unnest(_categories)c;
 SELECT coalesce(array_agg(DISTINCT t ORDER BY t),'{}') INTO tags FROM unnest(_adaptive_tags)t;
 UPDATE public.account_preferences SET content_categories=categories,adaptive_preferences=tags,updated_at=now() WHERE user_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'ACCOUNT_PREFERENCES_REQUIRED'; END IF;
 RETURN jsonb_build_object('categories',categories,'adaptive_tags',tags);
END $$;
REVOKE ALL ON FUNCTION public.save_my_browsing_preferences(text[],text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_my_browsing_preferences(text[],text[]) TO authenticated,service_role;