CREATE TABLE public.content_reaction_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), media_id uuid NOT NULL, customer_id uuid NOT NULL, previous_emoji text, new_emoji text, recorded_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.content_reaction_events TO service_role;
ALTER TABLE public.content_reaction_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX content_reaction_events_media_time ON public.content_reaction_events(media_id,recorded_at);
CREATE FUNCTION public.record_content_reaction_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF TG_OP='UPDATE' AND OLD.emoji=NEW.emoji THEN RETURN NEW; END IF;
 INSERT INTO public.content_reaction_events(media_id,customer_id,previous_emoji,new_emoji) VALUES(CASE WHEN TG_OP='DELETE' THEN OLD.media_id ELSE NEW.media_id END,CASE WHEN TG_OP='DELETE' THEN OLD.customer_id ELSE NEW.customer_id END,CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.emoji END,CASE WHEN TG_OP='DELETE' THEN NULL ELSE NEW.emoji END);
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END $$;
REVOKE ALL ON FUNCTION public.record_content_reaction_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER reaction_change_record AFTER INSERT OR UPDATE OR DELETE ON public.content_emoji_reactions FOR EACH ROW EXECUTE FUNCTION public.record_content_reaction_change();