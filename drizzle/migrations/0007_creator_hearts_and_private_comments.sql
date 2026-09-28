CREATE TABLE public.creator_hearts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, creator_id)
);
GRANT SELECT, INSERT, DELETE ON public.creator_hearts TO authenticated;
GRANT ALL ON public.creator_hearts TO service_role;
ALTER TABLE public.creator_hearts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own hearts or creator sees theirs" ON public.creator_hearts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = creator_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users heart as self" ON public.creator_hearts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND user_id <> creator_id);
CREATE POLICY "Users unheart own" ON public.creator_hearts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX idx_creator_hearts_creator ON public.creator_hearts(creator_id);

CREATE OR REPLACE FUNCTION public.get_heart_counts(_creator_ids uuid[])
RETURNS TABLE(creator_id uuid, hearts bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.creator_id, count(*) FROM public.creator_hearts h
  WHERE h.creator_id = ANY(_creator_ids) GROUP BY h.creator_id
$$;
REVOKE EXECUTE ON FUNCTION public.get_heart_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_heart_counts(uuid[]) TO anon, authenticated;

CREATE TABLE public.creator_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  media_id uuid,
  author_id uuid NOT NULL,
  parent_id uuid REFERENCES public.creator_comments(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.creator_comments TO authenticated;
GRANT ALL ON public.creator_comments TO service_role;
ALTER TABLE public.creator_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creator sees all own; fan sees own and replies to them" ON public.creator_comments FOR SELECT TO authenticated
  USING (
    auth.uid() = creator_id OR auth.uid() = author_id OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.creator_comments p WHERE p.id = parent_id AND p.author_id = auth.uid())
  );
CREATE POLICY "Fans comment, creators reply" ON public.creator_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND (
      (parent_id IS NULL AND author_id <> creator_id)
      OR (parent_id IS NOT NULL AND author_id = creator_id)
    )
  );
CREATE INDEX idx_creator_comments_creator ON public.creator_comments(creator_id, created_at DESC);