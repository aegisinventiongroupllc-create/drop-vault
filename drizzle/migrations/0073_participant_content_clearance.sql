CREATE TABLE public.content_participants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), creator_id uuid NOT NULL, linked_user_id uuid,
 label text NOT NULL, legal_name text, date_of_birth date, aliases text, country text,
 id_path text, selfie_path text, status text NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','pending','approved','rejected','held')),
 reviewer_id uuid, reviewed_at timestamptz, reviewer_notes text, identity_confirmed boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.content_participants TO service_role;
ALTER TABLE public.content_participants ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.content_manifests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), creator_id uuid NOT NULL, bucket text NOT NULL CHECK(bucket IN ('vault','teasers','creator-profile-photos','request-deliveries','profile-backdrops')),
 storage_path text NOT NULL, object_updated_at timestamptz NOT NULL, title text NOT NULL, recorded_on date NOT NULL,
 participant_ids uuid[] NOT NULL, includes_uploader boolean NOT NULL DEFAULT true, complete_declaration boolean NOT NULL DEFAULT false,
 production_evidence_path text, rights_evidence_path text,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','rejected','held')),
 reviewer_id uuid, reviewed_at timestamptz, reviewer_notes text, identity_confirmed boolean NOT NULL DEFAULT false,
 age_at_recording_confirmed boolean NOT NULL DEFAULT false, participants_confirmed boolean NOT NULL DEFAULT false, rights_confirmed boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(bucket,storage_path)
);
GRANT ALL ON public.content_manifests TO service_role;
ALTER TABLE public.content_manifests ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.participant_consents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), manifest_id uuid NOT NULL REFERENCES public.content_manifests(id), participant_id uuid NOT NULL REFERENCES public.content_participants(id),
 signed_name text NOT NULL, consent_text text NOT NULL, release_path text NOT NULL, consented_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz, UNIQUE(manifest_id,participant_id)
);
GRANT ALL ON public.participant_consents TO service_role;
ALTER TABLE public.participant_consents ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.participant_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), participant_id uuid NOT NULL REFERENCES public.content_participants(id), manifest_id uuid REFERENCES public.content_manifests(id),
 token_hash text UNIQUE NOT NULL, expires_at timestamptz NOT NULL DEFAULT now()+interval '72 hours', consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.participant_invitations TO service_role;
ALTER TABLE public.participant_invitations ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.content_review_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL, participant_id uuid REFERENCES public.content_participants(id), manifest_id uuid REFERENCES public.content_manifests(id),
 decision text NOT NULL, reason text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT ON public.content_review_events TO service_role;
ALTER TABLE public.content_review_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX participant_owner_queue ON public.content_participants(creator_id,status,created_at DESC);
CREATE INDEX participant_country_queue ON public.content_participants(country,status,created_at DESC);
CREATE INDEX manifest_owner_queue ON public.content_manifests(creator_id,status,created_at DESC);
CREATE INDEX invitation_participant ON public.participant_invitations(participant_id);
CREATE OR REPLACE FUNCTION public.content_is_cleared(_bucket text,_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.content_manifests m WHERE m.bucket=_bucket AND m.storage_path=_path AND m.status='approved' AND m.complete_declaration AND m.includes_uploader AND m.identity_confirmed AND m.age_at_recording_confirmed AND m.participants_confirmed AND m.rights_confirmed AND m.reviewer_id IS NOT NULL AND m.reviewed_at IS NOT NULL AND m.recorded_on<=current_date
 AND EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id=m.bucket AND o.name=m.storage_path AND o.updated_at=m.object_updated_at)
 AND EXISTS(SELECT 1 FROM public.creator_verifications v WHERE v.user_id=m.creator_id AND v.status='approved' AND v.identity_confirmed AND v.reviewed_at IS NOT NULL AND v.date_of_birth<=(m.recorded_on-interval '18 years')::date AND v.id=(SELECT id FROM public.creator_verifications WHERE user_id=m.creator_id ORDER BY submitted_at DESC,id DESC LIMIT 1))
 AND NOT EXISTS(SELECT 1 FROM public.account_bans WHERE user_id=m.creator_id)
 AND NOT EXISTS(SELECT 1 FROM unnest(m.participant_ids) pid LEFT JOIN public.content_participants p ON p.id=pid WHERE p.id IS NULL OR p.creator_id<>m.creator_id OR p.status<>'approved' OR NOT p.identity_confirmed OR p.reviewed_at IS NULL OR p.reviewer_id IS NULL OR p.date_of_birth IS NULL OR p.date_of_birth>(m.recorded_on-interval '18 years')::date OR NOT EXISTS(SELECT 1 FROM public.participant_consents c WHERE c.manifest_id=m.id AND c.participant_id=p.id AND c.revoked_at IS NULL)))
$$;
REVOKE ALL ON FUNCTION public.content_is_cleared(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.content_is_cleared(text,text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.content_review_access(_bucket text,_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND (public.has_role(auth.uid(),'admin') OR split_part(_path,'/',1)=auth.uid()::text OR public.content_is_cleared(_bucket,_path))
$$;
REVOKE ALL ON FUNCTION public.content_review_access(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.content_review_access(text,text) TO authenticated,service_role;
CREATE POLICY "Participant clearance restricts media reads" ON public.creator_media AS RESTRICTIVE FOR SELECT TO authenticated USING(public.content_review_access(bucket,storage_path));
CREATE POLICY "Participant clearance restricts portrait reads" ON public.creator_profile_photos AS RESTRICTIVE FOR SELECT TO authenticated USING(public.content_review_access('creator-profile-photos',storage_path));
CREATE POLICY "Participant clearance restricts backdrop reads" ON public.profile_backdrop_settings AS RESTRICTIVE FOR SELECT TO authenticated USING(upload_path IS NULL OR NOT public.has_role(user_id,'creator') OR public.content_review_access('profile-backdrops',upload_path));
CREATE POLICY "Participant clearance restricts storage reads" ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING(bucket_id NOT IN ('vault','teasers','creator-profile-photos','request-deliveries','profile-backdrops') OR (bucket_id='profile-backdrops' AND NOT public.has_role(split_part(name,'/',1)::uuid,'creator')) OR public.content_review_access(bucket_id,name));
CREATE POLICY "Participant evidence administrator read" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='participant-evidence' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Participant evidence creator staging" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='participant-evidence' AND split_part(name,'/',1)=auth.uid()::text AND public.has_role(auth.uid(),'creator'));
CREATE POLICY "Participant files immutable" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING(bucket_id NOT IN ('participant-evidence','vault','teasers','creator-profile-photos','request-deliveries','profile-backdrops')) WITH CHECK(bucket_id NOT IN ('participant-evidence','vault','teasers','creator-profile-photos','request-deliveries','profile-backdrops'));
CREATE OR REPLACE FUNCTION public.require_request_clearance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.delivery_path IS NOT NULL AND (TG_OP='INSERT' OR NEW.delivery_path IS DISTINCT FROM OLD.delivery_path) AND NOT public.content_is_cleared('request-deliveries',NEW.delivery_path) THEN RAISE EXCEPTION 'Participant review required before delivery'; END IF; RETURN NEW; END $$;
CREATE TRIGGER request_participant_clearance BEFORE INSERT OR UPDATE ON public.custom_requests FOR EACH ROW EXECUTE FUNCTION public.require_request_clearance();
CREATE OR REPLACE FUNCTION public.require_library_clearance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF (TG_OP='INSERT' OR NEW.expires_at>OLD.expires_at) AND NOT EXISTS(SELECT 1 FROM public.creator_media m WHERE m.creator_id=NEW.creator_id AND m.bucket='vault' AND public.content_is_cleared(m.bucket,m.storage_path)) THEN RAISE EXCEPTION 'LIBRARY_EMPTY'; END IF; RETURN NEW; END $$;
CREATE TRIGGER subscription_participant_clearance BEFORE INSERT OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.require_library_clearance();
CREATE OR REPLACE FUNCTION public.require_buyout_clearance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.creator_media m WHERE m.id=NEW.video_id AND public.content_is_cleared(m.bucket,m.storage_path)) THEN RAISE EXCEPTION 'Participant review required before purchase'; END IF; RETURN NEW; END $$;
CREATE TRIGGER buyout_participant_clearance BEFORE INSERT ON public.user_permanent_library FOR EACH ROW EXECUTE FUNCTION public.require_buyout_clearance();
CREATE OR REPLACE FUNCTION public.get_creator_library_count(_creator_id uuid) RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT count(*) FROM public.creator_media m WHERE m.creator_id=_creator_id AND m.bucket='vault' AND public.content_is_cleared(m.bucket,m.storage_path) AND auth.uid() IS NOT NULL AND (public.has_active_entry_pass(auth.uid()) OR public.has_role(auth.uid(),'creator') OR public.has_role(auth.uid(),'admin')) $$;
CREATE OR REPLACE FUNCTION public.guard_content_activation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF TG_TABLE_NAME='creator_media' THEN
 IF TG_OP='UPDATE' AND (NEW.storage_path IS DISTINCT FROM OLD.storage_path OR NEW.bucket IS DISTINCT FROM OLD.bucket OR NEW.creator_id IS DISTINCT FROM OLD.creator_id) THEN RAISE EXCEPTION 'Upload a new content version instead'; END IF;
 IF NEW.active_from IS NOT NULL AND (TG_OP='INSERT' OR NEW.active_from IS DISTINCT FROM OLD.active_from) AND NOT public.content_is_cleared(NEW.bucket,NEW.storage_path) THEN RAISE EXCEPTION 'Participant review required before activation'; END IF;
 ELSE
 IF TG_OP='UPDATE' AND (NEW.storage_path IS DISTINCT FROM OLD.storage_path OR NEW.creator_id IS DISTINCT FROM OLD.creator_id) THEN RAISE EXCEPTION 'Upload a new portrait version instead'; END IF;
 IF NEW.is_active AND (TG_OP='INSERT' OR NOT OLD.is_active) AND NOT public.content_is_cleared('creator-profile-photos',NEW.storage_path) THEN RAISE EXCEPTION 'Participant review required before activation'; END IF;
 END IF; RETURN NEW; END $$;
CREATE TRIGGER media_participant_activation BEFORE INSERT OR UPDATE ON public.creator_media FOR EACH ROW EXECUTE FUNCTION public.guard_content_activation();
CREATE TRIGGER portrait_participant_activation BEFORE INSERT OR UPDATE ON public.creator_profile_photos FOR EACH ROW EXECUTE FUNCTION public.guard_content_activation();
CREATE OR REPLACE FUNCTION public.validate_manifest_dates() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NEW.recorded_on>current_date OR NEW.recorded_on<date '1900-01-01' THEN RAISE EXCEPTION 'Valid recording date required'; END IF; IF NOT NEW.includes_uploader OR NOT NEW.complete_declaration THEN RAISE EXCEPTION 'Complete participant declaration required'; END IF; RETURN NEW; END $$;
CREATE TRIGGER manifest_dates BEFORE INSERT OR UPDATE ON public.content_manifests FOR EACH ROW EXECUTE FUNCTION public.validate_manifest_dates();