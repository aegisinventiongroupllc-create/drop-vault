// @vitest-environment node
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { CLEAN_TEMP_SCHEMA_SQL } from "./tempSchemaCleanup";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
async function fixture(sql: postgres.TransactionSql) {
  await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
  await sql.unsafe("CREATE TEMP TABLE dtt_identity_reviews (LIKE public.dtt_identity_reviews INCLUDING ALL) ON COMMIT DROP; CREATE TEMP TABLE customer_launch_waitlist (LIKE public.customer_launch_waitlist INCLUDING ALL) ON COMMIT DROP; CREATE TEMP TABLE account_bans(user_id uuid) ON COMMIT DROP; CREATE TEMP TABLE activity_logs (LIKE public.activity_logs INCLUDING ALL) ON COMMIT DROP;");
  await sql.unsafe("CREATE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS 'SELECT current_setting(''test.role'')=$2::text'");
  for (const fn of ["public.customer_identity_approved(uuid)", "public.guard_new_customer_ticket()", "public.review_dtt_identity(uuid,text,text,boolean,boolean,text,boolean)"]) {
    const [row] = await sql`SELECT pg_get_functiondef(${fn}::regprocedure) AS d`;
    let definition = row.d.replaceAll("auth.uid()", "current_setting('test.user')::uuid");
    for (const name of ["customer_identity_approved", "guard_new_customer_ticket", "review_dtt_identity", "dtt_identity_reviews", "customer_launch_waitlist", "account_bans", "activity_logs", "has_role"]) definition = definition.replaceAll(`public.${name}`, `pg_temp.${name}`);
    await sql.unsafe(definition);
  }
  await sql.unsafe("CREATE TRIGGER test_ticket_gate BEFORE INSERT ON pg_temp.customer_launch_waitlist FOR EACH ROW EXECUTE FUNCTION pg_temp.guard_new_customer_ticket()");
  const user = crypto.randomUUID();
  await sql`SELECT set_config('test.user',${user},true),set_config('test.role','customer',true)`;
  const [r] = await sql`INSERT INTO pg_temp.dtt_identity_reviews(user_id,audience,legal_first_name,date_of_birth,id_front_path,id_back_path,selfie_path,face_video_path,document_bucket,country,document_expires_on,document_type,issuing_country,document_number) VALUES(${user},'customer','Fixture',current_date-interval '18 years',${user+'/front.jpg'},${user+'/back.jpg'},${user+'/selfie.jpg'},${user+'/face.webm'},'dtt-identity-review','US',current_date+interval '5 years','national_id','US','fixture') RETURNING id`;
  return { user, id: r.id };
}
describe.skipIf(!db)("DTT manual identity ticket gate", () => {
  afterAll(async () => { await db?.end(); });
  it("denies new customer tickets until recorded human adult and face approval", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      const f = await fixture(sql);
      await expect(sql.savepoint(tx => tx`INSERT INTO pg_temp.customer_launch_waitlist(user_id,country,language) VALUES(${f.user},'US','en')`)).rejects.toThrow("DTT adult identity approval required");
      await sql`SELECT set_config('test.role','admin',true)`;
      await sql`SELECT pg_temp.review_dtt_identity(${f.id},'approved','checked',true,true,NULL,false)`;
      await sql`INSERT INTO pg_temp.customer_launch_waitlist(user_id,country,language) VALUES(${f.user},'US','en')`;
      const [row] = await sql`SELECT count(*)::int AS n FROM pg_temp.customer_launch_waitlist`;
      expect(row.n).toBe(1);
    });
  });
  it("cannot approve a face video without human confirmation", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => { const f = await fixture(sql); await sql`SELECT set_config('test.role','admin',true)`; await expect(sql.savepoint(tx => tx`SELECT pg_temp.review_dtt_identity(${f.id},'approved','',true,false,NULL,false)`)).rejects.toThrow("human face confirmation required"); });
  });
  it("rejects under-eighteen approval", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => { const f = await fixture(sql); await sql`UPDATE pg_temp.dtt_identity_reviews SET date_of_birth=current_date-interval '18 years'+interval '1 day'`; await sql`SELECT set_config('test.role','admin',true)`; await expect(sql.savepoint(tx => tx`SELECT pg_temp.review_dtt_identity(${f.id},'approved','',true,true,NULL,false)`)).rejects.toThrow("Readable adult identity"); });
  });
  it("rejects non-administrator review", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => { const f = await fixture(sql); await expect(sql.savepoint(tx => tx`SELECT pg_temp.review_dtt_identity(${f.id},'approved','',true,true,NULL,false)`)).rejects.toThrow("Administrator sign-in required"); });
  });
  it("keeps identity records private and denies direct client decisions", async () => {
    if (!db) throw Error("Database required");
    const [r] = await db`SELECT has_table_privilege('anon','public.dtt_identity_reviews','SELECT') AS public_read,has_table_privilege('authenticated','public.dtt_identity_reviews','UPDATE') AS client_write`;
    expect(r).toEqual({ public_read: false, client_write: false });
    const [bucket] = await db`SELECT public,file_size_limit FROM storage.buckets WHERE id='dtt-identity-review'`;
    expect(bucket.public).toBe(false); expect(Number(bucket.file_size_limit)).toBe(10485760);
  });
});