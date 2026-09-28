CREATE OR REPLACE FUNCTION public.comment_author(_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT author_id FROM public.creator_comments WHERE id = _id
$$;
REVOKE EXECUTE ON FUNCTION public.comment_author(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.comment_author(uuid) TO authenticated;
DROP POLICY "Creator sees all own; fan sees own and replies to them" ON public.creator_comments;
CREATE POLICY "Creator sees all own; fan sees own and replies to them" ON public.creator_comments FOR SELECT TO authenticated
  USING (
    auth.uid() = creator_id OR auth.uid() = author_id OR public.has_role(auth.uid(), 'admin')
    OR (parent_id IS NOT NULL AND public.comment_author(parent_id) = auth.uid())
  );