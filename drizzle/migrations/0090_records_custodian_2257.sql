CREATE TABLE public.records_custodian (
 id boolean PRIMARY KEY DEFAULT true CHECK (id),
 custodian_name text NOT NULL,
 inspection_address text NOT NULL,
 compliance_email text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.records_custodian IS '18 U.S.C. 2257 custodian of records and inspection location; intentionally separate from DMCA designated-agent details.';
INSERT INTO public.records_custodian(custodian_name, inspection_address, compliance_email)
VALUES ('DTT Media LLC (Custodian of Records)', '606 Liberty Avenue, Suite 300, Pittsburgh, PA', 'admin@dttmediallc.com');
GRANT SELECT ON public.records_custodian TO anon, authenticated;
GRANT ALL ON public.records_custodian TO service_role;
ALTER TABLE public.records_custodian ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Custodian notice is public" ON public.records_custodian FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.content_performer_index
 ADD COLUMN performer_record_id text GENERATED ALWAYS AS ('DTT-2257-P-' || upper(left(replace(coalesce(verification_id, participant_id)::text, '-', ''), 12))) STORED,
 ADD COLUMN content_record_id text GENERATED ALWAYS AS ('DTT-2257-C-' || upper(left(replace(manifest_id::text, '-', ''), 12))) STORED;
CREATE INDEX performer_index_performer_record ON public.content_performer_index(performer_record_id);
CREATE INDEX performer_index_content_record ON public.content_performer_index(content_record_id);