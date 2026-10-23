CREATE OR REPLACE FUNCTION public.get_creator_library_count(_creator_id uuid)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
 SELECT count(*) FROM public.creator_media m
 WHERE m.creator_id=_creator_id AND m.bucket='vault'
 AND auth.uid() IS NOT NULL
 AND (public.has_active_entry_pass(auth.uid()) OR public.has_role(auth.uid(),'creator') OR public.has_role(auth.uid(),'admin'))
 AND EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id='vault' AND o.name=m.storage_path);
$$;
REVOKE ALL ON FUNCTION public.get_creator_library_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_creator_library_count(uuid) TO authenticated, service_role;
DO $migration$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.unlock_creator(uuid)'::regprocedure) INTO definition;
 IF position('LIBRARY_EMPTY' IN definition)=0 THEN
  definition := replace(definition, 'SELECT balance INTO _balance FROM public.token_balances',
   'IF NOT EXISTS (SELECT 1 FROM public.creator_media m WHERE m.creator_id=_creator_id AND m.bucket=''vault'' AND EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id=''vault'' AND o.name=m.storage_path)) THEN RAISE EXCEPTION ''LIBRARY_EMPTY''; END IF;

  SELECT balance INTO _balance FROM public.token_balances');
  IF position('LIBRARY_EMPTY' IN definition)=0 THEN RAISE EXCEPTION 'Unlock guard insertion failed'; END IF;
  EXECUTE definition;
 END IF;
END $migration$;