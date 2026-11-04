CREATE TABLE public.bunny_video_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 creator_id uuid NOT NULL,
 bucket text NOT NULL CHECK (bucket IN ('teasers','vault')),
 storage_path text NOT NULL,
 source_updated_at timestamptz NOT NULL,
 video_id uuid NOT NULL UNIQUE,
 state text NOT NULL DEFAULT 'uploading' CHECK(state IN ('uploading','processing','ready','failed','deleting')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(bucket,storage_path)
);
GRANT ALL ON public.bunny_video_deliveries TO service_role;
ALTER TABLE public.bunny_video_deliveries ENABLE ROW LEVEL SECURITY;
CREATE INDEX bunny_delivery_owner ON public.bunny_video_deliveries(creator_id,created_at DESC);
COMMENT ON TABLE public.bunny_video_deliveries IS 'Service-owned delivery copies of permanently branded private originals. Originals remain authoritative for version-bound clearance and recovery. No client writes or provider keys.';
CREATE OR REPLACE FUNCTION public.bunny_source_current(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.bunny_video_deliveries b JOIN storage.objects o ON o.bucket_id=b.bucket AND o.name=b.storage_path AND o.updated_at=b.source_updated_at WHERE b.id=_id AND split_part(b.storage_path,'/',1)=b.creator_id::text)
$$;
REVOKE ALL ON FUNCTION public.bunny_source_current(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bunny_source_current(uuid) TO service_role;