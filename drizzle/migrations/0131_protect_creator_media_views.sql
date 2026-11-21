CREATE OR REPLACE FUNCTION public.protect_creator_media_views()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.views IS DISTINCT FROM OLD.views
     AND current_user IN ('authenticated', 'anon') THEN
    NEW.views := OLD.views;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_creator_media_views ON public.creator_media;
CREATE TRIGGER protect_creator_media_views BEFORE UPDATE ON public.creator_media
FOR EACH ROW EXECUTE FUNCTION public.protect_creator_media_views();
CREATE OR REPLACE FUNCTION public.protect_creator_media_views_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN NEW.views := 0; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_creator_media_views_insert ON public.creator_media;
CREATE TRIGGER protect_creator_media_views_insert BEFORE INSERT ON public.creator_media
FOR EACH ROW EXECUTE FUNCTION public.protect_creator_media_views_insert();