CREATE TABLE public.content_performer_index (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 manifest_id uuid NOT NULL REFERENCES public.content_manifests(id),
 creator_id uuid NOT NULL,
 bucket text NOT NULL,
 storage_path text NOT NULL,
 object_updated_at timestamptz NOT NULL,
 recorded_on date NOT NULL,
 performer_kind text NOT NULL CHECK (performer_kind IN ('uploader','participant')),
 verification_id uuid REFERENCES public.creator_verifications(id),
 participant_id uuid REFERENCES public.content_participants(id),
 linked_user_id uuid,
 legal_name text NOT NULL,
 date_of_birth date NOT NULL,
 stage_aliases text[] NOT NULL DEFAULT '{}',
 reviewer_id uuid NOT NULL,
 indexed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (manifest_id, performer_kind, verification_id, participant_id)
);
GRANT ALL ON public.content_performer_index TO service_role;
REVOKE ALL ON public.content_performer_index FROM PUBLIC, anon, authenticated;
ALTER TABLE public.content_performer_index ENABLE ROW LEVEL SECURITY;
CREATE INDEX performer_index_object ON public.content_performer_index(bucket, storage_path);
CREATE INDEX performer_index_legal ON public.content_performer_index(lower(legal_name));
CREATE INDEX performer_index_aliases ON public.content_performer_index USING gin(stage_aliases);
CREATE INDEX performer_index_creator ON public.content_performer_index(creator_id, indexed_at DESC);

CREATE FUNCTION public.keep_performer_index_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Performer index records are permanent'; END; $$;
CREATE TRIGGER keep_performer_index_immutable BEFORE UPDATE OR DELETE ON public.content_performer_index
 FOR EACH ROW EXECUTE FUNCTION public.keep_performer_index_immutable();

CREATE FUNCTION public.index_manifest_performers() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.creator_verifications; p public.content_participants; pid uuid; n int := 0;
BEGIN
 IF NEW.status <> 'approved' OR (TG_OP = 'UPDATE' AND OLD.status = 'approved') THEN RETURN NEW; END IF;
 IF NEW.includes_uploader THEN
  SELECT * INTO v FROM public.creator_verifications WHERE user_id = NEW.creator_id AND status = 'approved' ORDER BY reviewed_at DESC NULLS LAST LIMIT 1;
  IF v.id IS NULL THEN RAISE EXCEPTION 'Uploader has no approved identity record'; END IF;
  INSERT INTO public.content_performer_index(manifest_id,creator_id,bucket,storage_path,object_updated_at,recorded_on,performer_kind,verification_id,linked_user_id,legal_name,date_of_birth,stage_aliases,reviewer_id)
  VALUES (NEW.id,NEW.creator_id,NEW.bucket,NEW.storage_path,NEW.object_updated_at,NEW.recorded_on,'uploader',v.id,NEW.creator_id,
   trim(v.legal_first_name||' '||v.legal_last_name), v.date_of_birth,
   array_remove(ARRAY[nullif(trim(v.creator_username),''),(SELECT nullif(trim(display_name),'') FROM public.profiles WHERE user_id=NEW.creator_id)],NULL),
   NEW.reviewer_id) ON CONFLICT DO NOTHING;
 END IF;
 FOREACH pid IN ARRAY NEW.participant_ids LOOP
  SELECT * INTO p FROM public.content_participants WHERE id = pid;
  IF p.id IS NULL OR p.status <> 'approved' OR p.legal_name IS NULL OR p.date_of_birth IS NULL THEN
   RAISE EXCEPTION 'Participant % lacks an approved legal identity', pid; END IF;
  INSERT INTO public.content_performer_index(manifest_id,creator_id,bucket,storage_path,object_updated_at,recorded_on,performer_kind,participant_id,linked_user_id,legal_name,date_of_birth,stage_aliases,reviewer_id)
  VALUES (NEW.id,NEW.creator_id,NEW.bucket,NEW.storage_path,NEW.object_updated_at,NEW.recorded_on,'participant',p.id,p.linked_user_id,p.legal_name,p.date_of_birth,
   array_remove(ARRAY(SELECT nullif(trim(a),'') FROM unnest(string_to_array(coalesce(p.aliases,'')||','||coalesce(p.label,''),',')) a),NULL),
   NEW.reviewer_id) ON CONFLICT DO NOTHING;
 END LOOP;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.index_manifest_performers() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER index_manifest_performers AFTER INSERT OR UPDATE OF status ON public.content_manifests
 FOR EACH ROW EXECUTE FUNCTION public.index_manifest_performers();

INSERT INTO public.content_performer_index(manifest_id,creator_id,bucket,storage_path,object_updated_at,recorded_on,performer_kind,participant_id,linked_user_id,legal_name,date_of_birth,stage_aliases,reviewer_id)
SELECT m.id,m.creator_id,m.bucket,m.storage_path,m.object_updated_at,m.recorded_on,'participant',p.id,p.linked_user_id,p.legal_name,p.date_of_birth,
 array_remove(ARRAY(SELECT nullif(trim(a),'') FROM unnest(string_to_array(coalesce(p.aliases,'')||','||p.label,',')) a),NULL), m.reviewer_id
FROM public.content_manifests m JOIN public.content_participants p ON p.id = ANY(m.participant_ids)
WHERE m.status='approved' AND m.reviewer_id IS NOT NULL AND p.legal_name IS NOT NULL AND p.date_of_birth IS NOT NULL
ON CONFLICT DO NOTHING;