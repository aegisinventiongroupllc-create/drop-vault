CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=_user_id AND r.role=_role)
 AND (
   _user_id=auth.uid() OR auth.role()='service_role'
   OR EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id=auth.uid() AND a.role='admin')
   OR (_role IN ('creator','customer') AND EXISTS (SELECT 1 FROM public.public_profiles p WHERE p.user_id=_user_id AND p.role=_role::text))
 );
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.identity_evidence_is_referenced(_bucket text,_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT CASE WHEN auth.role()='service_role' OR public.has_role(auth.uid(),'admin')
 OR (auth.uid() IS NOT NULL AND split_part(_path,'/',1)=auth.uid()::text)
 THEN EXISTS (SELECT 1 FROM public.creator_verifications v WHERE v.document_bucket=_bucket AND _path IN (v.id_front_path,v.id_back_path,v.selfie_path))
 ELSE true END;
$$;
REVOKE ALL ON FUNCTION public.identity_evidence_is_referenced(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.identity_evidence_is_referenced(text,text) TO authenticated,service_role;

CREATE TABLE public.media_view_receipts (
 media_id uuid NOT NULL REFERENCES public.creator_media(id) ON DELETE CASCADE,
 viewer_id uuid NOT NULL,
 viewed_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date),
 PRIMARY KEY(media_id,viewer_id,viewed_on)
);
GRANT ALL ON public.media_view_receipts TO service_role;
ALTER TABLE public.media_view_receipts ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.media_view_receipts IS 'Private deduplication receipts, written only by the authorized view function; no client access.';

CREATE OR REPLACE FUNCTION public.increment_media_view(_media_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); inserted_count integer;
BEGIN
 IF u IS NULL THEN RETURN; END IF;
 IF NOT (public.has_active_entry_pass(u) OR public.has_role(u,'creator') OR public.has_role(u,'admin')) THEN RETURN; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.get_active_teasers() m WHERE m.id=_media_id AND m.creator_id<>u AND public.content_is_cleared(m.bucket,m.storage_path)) THEN RETURN; END IF;
 INSERT INTO public.media_view_receipts(media_id,viewer_id) VALUES(_media_id,u) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted_count=ROW_COUNT;
 IF inserted_count=1 THEN UPDATE public.creator_media SET views=coalesce(views,0)+1 WHERE id=_media_id; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_media_view(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.increment_media_view(uuid) TO authenticated,service_role;