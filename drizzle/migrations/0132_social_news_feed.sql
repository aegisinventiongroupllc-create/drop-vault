CREATE TABLE public.feed_posts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 creator_id uuid NOT NULL,
 country_code text NOT NULL,
 creator_category text NOT NULL,
 caption text NOT NULL DEFAULT '',
 media_id uuid REFERENCES public.creator_media(id) ON DELETE SET NULL,
 vault_preview boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT feed_caption_len CHECK (char_length(caption)<=1000),
 CONSTRAINT feed_category_ok CHECK (creator_category IN ('women','men','trans_women','trans_men')));
CREATE INDEX feed_posts_filter_idx ON public.feed_posts(country_code,creator_category,created_at DESC);
CREATE INDEX feed_posts_creator_idx ON public.feed_posts(creator_id,created_at DESC);
CREATE TABLE public.feed_post_likes(post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE, user_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(post_id,user_id));
CREATE TABLE public.feed_post_comments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE, user_id uuid NOT NULL, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT feed_comment_len CHECK (char_length(btrim(body)) BETWEEN 1 AND 500));
CREATE INDEX feed_comments_post_idx ON public.feed_post_comments(post_id,created_at);
GRANT SELECT, INSERT, DELETE ON public.feed_posts TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.feed_post_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.feed_post_comments TO authenticated;
GRANT ALL ON public.feed_posts, public.feed_post_likes, public.feed_post_comments TO service_role;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_post_comments ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.stamp_feed_post() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p record;
BEGIN
 IF NOT public.can_upload_creator_media(NEW.creator_id) THEN RAISE EXCEPTION 'APPROVED_CREATOR_REQUIRED'; END IF;
 SELECT country, vault_side INTO p FROM public.profiles WHERE user_id=NEW.creator_id;
 IF p.country IS NULL OR p.vault_side NOT IN ('women','men','trans_women','trans_men') THEN RAISE EXCEPTION 'PROFILE_COUNTRY_CATEGORY_REQUIRED'; END IF;
 NEW.country_code:=upper(p.country); NEW.creator_category:=p.vault_side; NEW.created_at:=now();
 NEW.caption:=btrim(regexp_replace(NEW.caption,'[[:cntrl:]]',' ','g'));
 IF NEW.media_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.creator_media WHERE id=NEW.media_id AND creator_id=NEW.creator_id AND bucket='teasers') THEN RAISE EXCEPTION 'OWN_TEASER_REQUIRED'; END IF;
 IF NEW.caption='' AND NEW.media_id IS NULL AND NOT NEW.vault_preview THEN RAISE EXCEPTION 'EMPTY_POST'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER stamp_feed_post BEFORE INSERT ON public.feed_posts FOR EACH ROW EXECUTE FUNCTION public.stamp_feed_post();

CREATE POLICY "Signed-in read feed" ON public.feed_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Approved creators post as themselves" ON public.feed_posts FOR INSERT TO authenticated WITH CHECK (creator_id=auth.uid() AND public.can_upload_creator_media(auth.uid()));
CREATE POLICY "Creators delete own posts" ON public.feed_posts FOR DELETE TO authenticated USING (creator_id=auth.uid());
CREATE POLICY "Signed-in read likes" ON public.feed_post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Like as self" ON public.feed_post_likes FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());
CREATE POLICY "Unlike own" ON public.feed_post_likes FOR DELETE TO authenticated USING (user_id=auth.uid());
CREATE POLICY "Signed-in read comments" ON public.feed_post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Comment as self" ON public.feed_post_comments FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND NOT EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=auth.uid()));
CREATE POLICY "Delete own or on own post" ON public.feed_post_comments FOR DELETE TO authenticated USING (user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.feed_posts f WHERE f.id=post_id AND f.creator_id=auth.uid()));

CREATE FUNCTION public.get_feed_posts(_country text, _category text, _tab text, _offset integer DEFAULT 0)
RETURNS TABLE(id uuid, creator_id uuid, country_code text, creator_category text, caption text, media_id uuid, media_path text, media_type text, vault_preview boolean, created_at timestamptz, display_name text, avatar_config jsonb, profile_photo_path text, likes bigint, comments bigint, liked boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT f.id,f.creator_id,f.country_code,f.creator_category,f.caption,f.media_id,m.storage_path,m.media_type,f.vault_preview,f.created_at,p.display_name,p.avatar_config,p.profile_photo_path,
  (SELECT count(*) FROM feed_post_likes l WHERE l.post_id=f.id),(SELECT count(*) FROM feed_post_comments c WHERE c.post_id=f.id),
  EXISTS(SELECT 1 FROM feed_post_likes l WHERE l.post_id=f.id AND l.user_id=auth.uid())
 FROM feed_posts f JOIN public_profiles p ON p.user_id=f.creator_id LEFT JOIN creator_media m ON m.id=f.media_id
 WHERE auth.uid() IS NOT NULL
  AND (_country IS NULL OR _country='WW' OR f.country_code=upper(_country))
  AND CASE WHEN _category='adaptive' THEN cardinality(COALESCE(p.adaptive_tags,'{}'))>0 ELSE f.creator_category=_category END
  AND (_tab<>'following' OR EXISTS(SELECT 1 FROM creator_paid_followers cf WHERE cf.creator_id=f.creator_id AND cf.customer_id=auth.uid()) OR f.creator_id=auth.uid())
  AND (_tab<>'trending' OR f.created_at>now()-interval '7 days')
 ORDER BY CASE WHEN _tab='trending' THEN (SELECT count(*) FROM feed_post_likes l WHERE l.post_id=f.id) END DESC NULLS LAST, f.created_at DESC
 LIMIT 20 OFFSET GREATEST(0,LEAST(COALESCE(_offset,0),2000)) $$;
REVOKE ALL ON FUNCTION public.get_feed_posts(text,text,text,integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_feed_posts(text,text,text,integer) TO authenticated;