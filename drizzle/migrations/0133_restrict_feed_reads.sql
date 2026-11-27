CREATE FUNCTION public.can_view_feed(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT _uid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM account_bans WHERE user_id=_uid)
  AND (public.has_role(_uid,'admin') OR public.has_role(_uid,'creator') OR public.has_active_entry_pass(_uid)) $$;
REVOKE ALL ON FUNCTION public.can_view_feed(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_view_feed(uuid) TO authenticated;
DROP POLICY "Signed-in read feed" ON public.feed_posts;
CREATE POLICY "Feed members read posts" ON public.feed_posts FOR SELECT TO authenticated USING (creator_id=auth.uid() OR public.can_view_feed(auth.uid()));
DROP POLICY "Signed-in read likes" ON public.feed_post_likes;
CREATE POLICY "Read own likes" ON public.feed_post_likes FOR SELECT TO authenticated USING (user_id=auth.uid());
DROP POLICY "Like as self" ON public.feed_post_likes;
CREATE POLICY "Feed members like as self" ON public.feed_post_likes FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND public.can_view_feed(auth.uid()));
DROP POLICY "Signed-in read comments" ON public.feed_post_comments;
CREATE POLICY "Feed members read comments" ON public.feed_post_comments FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.can_view_feed(auth.uid()));
DROP POLICY "Comment as self" ON public.feed_post_comments;
CREATE POLICY "Feed members comment as self" ON public.feed_post_comments FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND public.can_view_feed(auth.uid()));
CREATE OR REPLACE FUNCTION public.get_feed_posts(_country text, _category text, _tab text, _offset integer DEFAULT 0)
RETURNS TABLE(id uuid, creator_id uuid, country_code text, creator_category text, caption text, media_id uuid, media_path text, media_type text, vault_preview boolean, created_at timestamptz, display_name text, avatar_config jsonb, profile_photo_path text, likes bigint, comments bigint, liked boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT f.id,f.creator_id,f.country_code,f.creator_category,f.caption,f.media_id,m.storage_path,m.media_type,f.vault_preview,f.created_at,p.display_name,p.avatar_config,p.profile_photo_path,
  (SELECT count(*) FROM feed_post_likes l WHERE l.post_id=f.id),(SELECT count(*) FROM feed_post_comments c WHERE c.post_id=f.id),
  EXISTS(SELECT 1 FROM feed_post_likes l WHERE l.post_id=f.id AND l.user_id=auth.uid())
 FROM feed_posts f JOIN public_profiles p ON p.user_id=f.creator_id LEFT JOIN creator_media m ON m.id=f.media_id
 WHERE public.can_view_feed(auth.uid())
  AND (_country IS NULL OR _country='WW' OR f.country_code=upper(_country))
  AND CASE WHEN _category='adaptive' THEN cardinality(COALESCE(p.adaptive_tags,'{}'))>0 ELSE f.creator_category=_category END
  AND (_tab<>'following' OR EXISTS(SELECT 1 FROM creator_paid_followers cf WHERE cf.creator_id=f.creator_id AND cf.customer_id=auth.uid()) OR f.creator_id=auth.uid())
  AND (_tab<>'trending' OR f.created_at>now()-interval '7 days')
 ORDER BY CASE WHEN _tab='trending' THEN (SELECT count(*) FROM feed_post_likes l WHERE l.post_id=f.id) END DESC NULLS LAST, f.created_at DESC
 LIMIT 20 OFFSET GREATEST(0,LEAST(COALESCE(_offset,0),2000)) $$;