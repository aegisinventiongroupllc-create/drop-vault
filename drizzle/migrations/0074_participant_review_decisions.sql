CREATE OR REPLACE FUNCTION public.participant_object_evidence(_bucket text,_path text) RETURNS TABLE(updated_at timestamptz,name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT o.updated_at,o.name FROM storage.objects o WHERE o.bucket_id=_bucket AND o.name=_path $$;
REVOKE ALL ON FUNCTION public.participant_object_evidence(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.participant_object_evidence(text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.review_participant_content(_id uuid,_kind text,_status text,_notes text,_reviewer uuid,_confirmed boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.content_participants; m public.content_manifests;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' OR NOT public.has_role(_reviewer,'admin') THEN RAISE EXCEPTION 'Administrator required'; END IF;
 IF _status NOT IN ('approved','rejected','held') OR (_status<>'approved' AND length(trim(coalesce(_notes,'')))=0) THEN RAISE EXCEPTION 'Decision and reason required'; END IF;
 IF _status='approved' AND NOT coalesce(_confirmed,false) THEN RAISE EXCEPTION 'Review confirmation required'; END IF;
 IF _kind='participant' THEN
 SELECT * INTO p FROM public.content_participants WHERE id=_id FOR UPDATE;
 IF p.id IS NULL OR p.creator_id=_reviewer OR p.linked_user_id=_reviewer THEN RAISE EXCEPTION 'Record unavailable or self review forbidden'; END IF;
 IF _status='approved' THEN
 IF p.status NOT IN ('pending','held','rejected') OR p.date_of_birth IS NULL OR p.date_of_birth>(current_date-interval '18 years')::date OR p.date_of_birth<(current_date-interval '120 years')::date OR length(trim(p.legal_name))<2 THEN RAISE EXCEPTION 'Valid adult identity required'; END IF;
 IF p.linked_user_id IS NULL AND (p.id_path IS NULL OR p.selfie_path IS NULL OR p.id_path=p.selfie_path OR (SELECT count(*) FROM storage.objects WHERE bucket_id='participant-evidence' AND name IN (p.id_path,p.selfie_path))<>2) THEN RAISE EXCEPTION 'Private identity evidence missing'; END IF;
 IF p.linked_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.creator_verifications v WHERE v.user_id=p.linked_user_id AND v.status='approved' AND v.identity_confirmed AND v.reviewed_at IS NOT NULL AND v.id=(SELECT id FROM public.creator_verifications WHERE user_id=p.linked_user_id ORDER BY submitted_at DESC,id DESC LIMIT 1)) THEN RAISE EXCEPTION 'Linked creator identity unavailable'; END IF;
 END IF;
 UPDATE public.content_participants SET status=_status,reviewer_id=_reviewer,reviewed_at=now(),reviewer_notes=_notes,identity_confirmed=(_status='approved') WHERE id=_id;
 INSERT INTO public.content_review_events(actor_id,participant_id,decision,reason) VALUES(_reviewer,_id,_status,_notes);
 ELSIF _kind='content' THEN
 SELECT * INTO m FROM public.content_manifests WHERE id=_id FOR UPDATE;
 IF m.id IS NULL OR m.creator_id=_reviewer THEN RAISE EXCEPTION 'Record unavailable or self review forbidden'; END IF;
 IF _status='approved' THEN
 IF m.status NOT IN ('pending','held','rejected') OR m.production_evidence_path IS NULL OR m.rights_evidence_path IS NULL OR (SELECT count(*) FROM storage.objects WHERE bucket_id='participant-evidence' AND name IN (m.production_evidence_path,m.rights_evidence_path))<1 THEN RAISE EXCEPTION 'Production and rights evidence missing'; END IF;
 END IF;
 UPDATE public.content_manifests SET status=_status,reviewer_id=_reviewer,reviewed_at=now(),reviewer_notes=_notes,identity_confirmed=(_status='approved'),age_at_recording_confirmed=(_status='approved'),participants_confirmed=(_status='approved'),rights_confirmed=(_status='approved') WHERE id=_id;
 IF _status='approved' AND NOT public.content_is_cleared(m.bucket,m.storage_path) THEN RAISE EXCEPTION 'All participant identities, recording ages and content-specific consents must be cleared'; END IF;
 INSERT INTO public.content_review_events(actor_id,manifest_id,decision,reason) VALUES(_reviewer,_id,_status,_notes);
 ELSE RAISE EXCEPTION 'Invalid review kind'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.review_participant_content(uuid,text,text,text,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_participant_content(uuid,text,text,text,uuid,boolean) TO service_role;