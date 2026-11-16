ALTER TABLE public.profiles DROP CONSTRAINT profiles_adaptive_tags_valid;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_adaptive_tags_valid CHECK (adaptive_tags <@ ARRAY['adaptive-creator','mobility-aid-wheelchair-user','prosthetic-limb-difference','sensory-inclusive','plus-size-curvy','petite','muscle-athletic','mature','custom-request-friendly']::text[] AND cardinality(adaptive_tags)<=9 AND array_position(adaptive_tags,NULL) IS NULL);
ALTER TABLE public.account_preferences DROP CONSTRAINT account_adaptive_preferences_valid;
ALTER TABLE public.account_preferences ADD CONSTRAINT account_adaptive_preferences_valid CHECK (adaptive_preferences <@ ARRAY['adaptive-creator','mobility-aid-wheelchair-user','prosthetic-limb-difference','sensory-inclusive','plus-size-curvy','petite','muscle-athletic','mature','custom-request-friendly']::text[] AND array_position(adaptive_preferences,NULL) IS NULL);
DO $$ DECLARE fn text; definition text; BEGIN
 FOREACH fn IN ARRAY ARRAY['public.save_my_adaptive_tags(text[])','public.save_my_browsing_preferences(text[],text[])','public.search_creator_adaptive(text,text[],text[],text[],integer)','public.get_teaser_adaptive(text[],text[],text,text,integer)'] LOOP
  SELECT pg_get_functiondef(fn::regprocedure) INTO definition;
  definition := replace(definition,'''sensory-inclusive'']','''sensory-inclusive'', ''plus-size-curvy'', ''petite'', ''muscle-athletic'', ''mature'', ''custom-request-friendly'']');
  definition := replace(definition,'cardinality(_tags)>4','cardinality(_tags)>9');
  EXECUTE definition;
 END LOOP;
END $$;