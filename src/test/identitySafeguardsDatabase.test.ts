// @vitest-environment node
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { CLEAN_TEMP_SCHEMA_SQL } from "./tempSchemaCleanup";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
describe.skipIf(!db)("Private identity safeguards", () => {
  afterAll(async () => { await db?.end(); });
  it("fails closed for collection before privacy readiness", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
      await sql.unsafe("CREATE TEMP TABLE app_settings(key text,value jsonb) ON COMMIT DROP");
      const [fn] = await sql`SELECT pg_get_functiondef('public.dtt_identity_collection_ready()'::regprocedure) AS d`;
      await sql.unsafe(fn.d.replaceAll('public.dtt_identity_collection_ready','pg_temp.dtt_identity_collection_ready').replaceAll('public.app_settings','pg_temp.app_settings'));
      const [r] = await sql`SELECT pg_temp.dtt_identity_collection_ready() AS ready`; expect(r.ready).toBe(false);
      await sql`INSERT INTO pg_temp.app_settings VALUES('dtt_identity_collection','{"enabled":true}'::jsonb)`;
      const [incomplete] = await sql`SELECT pg_temp.dtt_identity_collection_ready() AS ready`; expect(incomplete.ready).toBe(false);
    });
  });
  it("denies anonymous and direct account access to encrypted audits", async () => { if (!db) throw Error("Database required"); const [r] = await db`SELECT has_table_privilege('anon','public.customer_age_audits','SELECT') AS a,has_table_privilege('authenticated','public.customer_age_audits','SELECT') AS u,has_function_privilege('authenticated','public.finalize_customer_age_review(uuid,text)','EXECUTE') AS f`; expect(r).toEqual({a:false,u:false,f:false}); });
  it("locks identity type, issuing country, name and linkage after submission", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
      await sql.unsafe("CREATE TEMP TABLE dtt_identity_reviews (LIKE public.dtt_identity_reviews INCLUDING ALL) ON COMMIT DROP");
      const [fn] = await sql`SELECT pg_get_functiondef('public.keep_dtt_identity_evidence()'::regprocedure) AS d`;
      await sql.unsafe(fn.d.replace("public.keep_dtt_identity_evidence", "pg_temp.keep_dtt_identity_evidence"));
      await sql.unsafe("CREATE TRIGGER immutable_test BEFORE UPDATE ON pg_temp.dtt_identity_reviews FOR EACH ROW EXECUTE FUNCTION pg_temp.keep_dtt_identity_evidence()");
      const u = crypto.randomUUID();
      await sql`INSERT INTO pg_temp.dtt_identity_reviews(user_id,audience,legal_first_name,date_of_birth,id_front_path,id_back_path,selfie_path,face_video_path,document_bucket,document_expires_on,document_type,issuing_country,document_number) VALUES(${u},'customer','Fixture','2000-01-01','a/f','a/b','a/s','a/v','dtt-identity-review','2030-01-01','passport','US','fixture')`;
      await expect(sql.savepoint(tx => tx`UPDATE pg_temp.dtt_identity_reviews SET issuing_country='CA'`)).rejects.toThrow("immutable");
      await expect(sql.savepoint(tx => tx`UPDATE pg_temp.dtt_identity_reviews SET document_type='other'`)).rejects.toThrow("immutable");
      await expect(sql.savepoint(tx => tx`UPDATE pg_temp.dtt_identity_reviews SET legal_last_name='Changed'`)).rejects.toThrow("immutable");
      await expect(sql.savepoint(tx => tx`UPDATE pg_temp.dtt_identity_reviews SET creator_verification_id=${crypto.randomUUID()}`)).rejects.toThrow("immutable");
    });
  });
  it("blocks replacement, gates uploads and protects referenced evidence restrictively", async () => { if (!db) throw Error("Database required"); const rows = await db`SELECT policyname,permissive FROM pg_policies WHERE schemaname='storage' AND policyname IN ('Never replace identity evidence','Retain referenced DTT evidence','Identity collection readiness','Audited administrator identity file access')`; expect(rows.length).toBe(4); expect(rows.every(r=>r.permissive==='RESTRICTIVE')).toBe(true); });
  it("keeps all identity buckets private and bounded to 10MB", async () => { if (!db) throw Error("Database required"); const rows = await db`SELECT public,file_size_limit,allowed_mime_types FROM storage.buckets WHERE id IN ('dtt-identity-review','creator-2257-records','identity-documents','id-verifications')`; expect(rows.length).toBe(4); for (const row of rows) { expect(row.public).toBe(false); expect(Number(row.file_size_limit)).toBe(10485760); expect(row.allowed_mime_types.length).toBeGreaterThan(0); } });
});