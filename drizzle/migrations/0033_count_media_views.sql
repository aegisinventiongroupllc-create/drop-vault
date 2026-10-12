CREATE OR REPLACE FUNCTION public.increment_media_view(_media_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.creator_media SET views = views + 1 WHERE id = _media_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.increment_media_view(uuid) TO authenticated;