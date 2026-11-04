REVOKE ALL ON public.creator_drafts FROM PUBLIC,anon;
REVOKE ALL ON public.creator_identity_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.creator_identity_events TO authenticated;
GRANT ALL ON public.creator_identity_events TO service_role;
REVOKE ALL ON FUNCTION public.log_creator_identity_event() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.keep_identity_events_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Identity audit events are immutable'; END $$;
CREATE TRIGGER immutable_identity_audit BEFORE UPDATE OR DELETE ON public.creator_identity_events FOR EACH ROW EXECUTE FUNCTION public.keep_identity_events_immutable();
CREATE FUNCTION public.protect_draft_registration() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.creator_id IS DISTINCT FROM OLD.creator_id OR NEW.storage_path IS DISTINCT FROM OLD.storage_path OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.is_published OR NEW.status<>'draft' THEN RAISE EXCEPTION 'Draft ownership, media and publication are server managed'; END IF; RETURN NEW; END $$;
CREATE TRIGGER protect_private_draft BEFORE UPDATE ON public.creator_drafts FOR EACH ROW EXECUTE FUNCTION public.protect_draft_registration();