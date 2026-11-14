CREATE OR REPLACE FUNCTION public.comment_author(_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT author_id FROM public.creator_comments WHERE id = _id AND author_id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.comment_author(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.comment_author(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.creator_split_percent(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creator_split_percent(uuid) TO service_role;