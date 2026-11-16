CREATE TABLE public.creator_reaction_settings (creator_id uuid PRIMARY KEY, enabled boolean NOT NULL DEFAULT false);
GRANT SELECT ON public.creator_reaction_settings TO authenticated;
GRANT ALL ON public.creator_reaction_settings TO service_role;
ALTER TABLE public.creator_reaction_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_read ON public.creator_reaction_settings FOR SELECT TO authenticated USING (creator_id=auth.uid() AND public.has_role(auth.uid(),'creator'));
CREATE TABLE public.content_emoji_reactions (media_id uuid NOT NULL REFERENCES public.creator_media(id) ON DELETE CASCADE, customer_id uuid NOT NULL, emoji text NOT NULL CHECK (emoji IN ('❤️','🔥','😍','👏','✨')), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(media_id,customer_id));
GRANT SELECT ON public.content_emoji_reactions TO authenticated;
GRANT ALL ON public.content_emoji_reactions TO service_role;
ALTER TABLE public.content_emoji_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY customer_read ON public.content_emoji_reactions FOR SELECT TO authenticated USING (customer_id=auth.uid());
CREATE INDEX content_emoji_reactions_media ON public.content_emoji_reactions(media_id,emoji);
CREATE FUNCTION public.can_react_to_content(_media_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'customer') AND public.has_active_entry_pass(auth.uid()) AND NOT EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=auth.uid()) AND EXISTS (
 SELECT 1 FROM public.creator_media m WHERE m.id=_media_id AND m.creator_id<>auth.uid() AND m.bucket='vault' AND public.content_is_cleared(m.bucket,m.storage_path) AND (
 EXISTS(SELECT 1 FROM public.user_permanent_library p WHERE p.video_id=m.id AND p.customer_id=auth.uid()) OR
 (EXISTS(SELECT 1 FROM public.subscriptions s WHERE s.creator_id=m.creator_id AND s.customer_id=auth.uid() AND s.status='active' AND s.expires_at>now()) AND (m.library_slot='regular' OR EXISTS(SELECT 1 FROM public.video_early_access e WHERE e.video_id=m.id AND e.customer_id=auth.uid())))
 )); $$;
CREATE FUNCTION public.my_reaction_setting() RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'creator') THEN RAISE EXCEPTION 'CREATOR_REQUIRED'; END IF;
 RETURN coalesce((SELECT enabled FROM public.creator_reaction_settings WHERE creator_id=auth.uid()),false); END $$;
CREATE FUNCTION public.set_my_reaction_setting(_enabled boolean) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'creator') THEN RAISE EXCEPTION 'CREATOR_REQUIRED'; END IF;
 IF _enabled IS NULL THEN RAISE EXCEPTION 'SETTING_REQUIRED'; END IF;
 INSERT INTO public.creator_reaction_settings(creator_id,enabled) VALUES(auth.uid(),_enabled) ON CONFLICT(creator_id) DO UPDATE SET enabled=excluded.enabled;
 RETURN _enabled; END $$;
CREATE FUNCTION public.content_reaction_state(_media_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE c uuid; on_state boolean; counts jsonb; BEGIN
 SELECT creator_id INTO c FROM public.creator_media WHERE id=_media_id AND bucket='vault';
 IF c IS NULL OR auth.uid() IS NULL THEN RETURN jsonb_build_object('enabled',false,'allowed',false); END IF;
 on_state:=coalesce((SELECT enabled FROM public.creator_reaction_settings WHERE creator_id=c),false);
 IF c=auth.uid() AND public.has_role(auth.uid(),'creator') THEN
 SELECT coalesce(jsonb_object_agg(emoji,n),'{}'::jsonb) INTO counts FROM (SELECT emoji,count(*) n FROM public.content_emoji_reactions WHERE media_id=_media_id GROUP BY emoji) q;
 RETURN jsonb_build_object('enabled',on_state,'owner',true,'counts',counts);
 END IF;
 IF NOT on_state OR NOT public.can_react_to_content(_media_id) THEN RETURN jsonb_build_object('enabled',false,'allowed',false); END IF;
 RETURN jsonb_build_object('enabled',true,'allowed',true,'selected',(SELECT emoji FROM public.content_emoji_reactions WHERE media_id=_media_id AND customer_id=auth.uid()));
 END $$;
CREATE FUNCTION public.set_content_reaction(_media_id uuid,_emoji text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE c uuid; on_state boolean; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'SIGN_IN_REQUIRED'; END IF;
 IF _emoji IS NOT NULL AND _emoji NOT IN ('❤️','🔥','😍','👏','✨') THEN RAISE EXCEPTION 'INVALID_EMOJI'; END IF;
 SELECT creator_id INTO c FROM public.creator_media WHERE id=_media_id AND bucket='vault';
 SELECT enabled INTO on_state FROM public.creator_reaction_settings WHERE creator_id=c FOR UPDATE;
 IF on_state IS DISTINCT FROM true THEN RAISE EXCEPTION 'REACTIONS_DISABLED'; END IF;
 IF NOT public.can_react_to_content(_media_id) THEN RAISE EXCEPTION 'PAID_CONTENT_ACCESS_REQUIRED'; END IF;
 IF _emoji IS NULL THEN DELETE FROM public.content_emoji_reactions WHERE media_id=_media_id AND customer_id=auth.uid();
 ELSE INSERT INTO public.content_emoji_reactions(media_id,customer_id,emoji) VALUES(_media_id,auth.uid(),_emoji) ON CONFLICT(media_id,customer_id) DO UPDATE SET emoji=excluded.emoji,updated_at=now(); END IF;
 RETURN public.content_reaction_state(_media_id); END $$;
REVOKE ALL ON FUNCTION public.can_react_to_content(uuid),public.my_reaction_setting(),public.set_my_reaction_setting(boolean),public.content_reaction_state(uuid),public.set_content_reaction(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_react_to_content(uuid),public.my_reaction_setting(),public.set_my_reaction_setting(boolean),public.content_reaction_state(uuid),public.set_content_reaction(uuid,text) TO authenticated,service_role;