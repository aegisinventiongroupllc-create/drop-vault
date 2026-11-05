CREATE FUNCTION public.search_performer_index(_query text, _offset integer DEFAULT 0)
RETURNS TABLE(performer_record_id text, content_record_id text, legal_name text, date_of_birth date, stage_aliases text[], performer_kind text, creator_id uuid, storage_path text, recorded_on date, indexed_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE q text := lower(btrim(coalesce(_query, '')));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF length(q) < 2 THEN RETURN; END IF;
  RETURN QUERY
  SELECT i.performer_record_id, i.content_record_id, i.legal_name, i.date_of_birth, i.stage_aliases, i.performer_kind, i.creator_id, i.storage_path, i.recorded_on, i.indexed_at
  FROM public.content_performer_index i
  WHERE lower(i.legal_name) LIKE '%' || q || '%'
     OR lower(i.performer_record_id) = q OR lower(i.content_record_id) = q
     OR EXISTS (SELECT 1 FROM unnest(i.stage_aliases) a WHERE lower(a) LIKE '%' || q || '%')
  ORDER BY i.indexed_at DESC, i.id
  LIMIT 50 OFFSET greatest(coalesce(_offset, 0), 0);
END $$;
REVOKE ALL ON FUNCTION public.search_performer_index(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_performer_index(text, integer) TO authenticated;