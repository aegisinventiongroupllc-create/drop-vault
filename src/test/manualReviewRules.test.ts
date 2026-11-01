// @vitest-environment node
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false }) : null;
describe.skipIf(!db)("isolated manual identity decisions", () => {
  afterAll(async () => { await db?.end(); });
  const cases = [
    { name: "non-admin cannot review", admin: false, error: "Administrator sign-in required" },
    { name: "reviewer cannot approve themselves", self: true, error: "Self review is forbidden" },
    { name: "approval requires matching evidence confirmation", confirmed: false, error: "Confirmed adult creator identity required" },
    { name: "underage creator cannot be approved", dob: "2015-01-01", error: "Confirmed adult creator identity required" },
    { name: "already reviewed records cannot be decided again", initial: "approved", error: "Submission already reviewed or unavailable" },
    { name: "decline requires a reason", decision: "rejected", error: "Decline reason required" },
    { name: "decline records a correction reason", decision: "rejected", notes: "Holding note missing date" },
    { name: "adult ID approval records reviewer confirmation", decision: "approved" },
  ];
  it.each(cases)("$name", async c => {
    if (!db) throw Error("Database required");
    const rollback = Error("rollback isolated review");
    await db.begin(async sql => {
      await sql.unsafe(`CREATE TEMP TABLE creator_verifications(id uuid,user_id uuid,status text,date_of_birth date,id_front_path text,selfie_path text,document_bucket text,reviewer_id uuid,reviewed_at timestamptz,reviewer_notes text,identity_confirmed boolean);
        CREATE TEMP TABLE objects(bucket_id text,name text);
        CREATE TEMP TABLE user_roles(user_id uuid,role text);
        CREATE FUNCTION pg_temp.review_uid() RETURNS uuid LANGUAGE sql AS 'SELECT nullif(current_setting(''test.review_uid'',true),'''')::uuid';
        CREATE FUNCTION pg_temp.review_role(uid uuid,r text) RETURNS boolean LANGUAGE sql AS 'SELECT EXISTS(SELECT 1 FROM pg_temp.user_roles WHERE user_id=uid AND role=r)';`);
      const definition = await sql`SELECT pg_get_functiondef('public.review_creator_identity(uuid,text,text,boolean)'::regprocedure) AS body`;
      await sql.unsafe(definition[0].body.replaceAll("public.review_creator_identity", "pg_temp.review_creator_identity").replaceAll("public.creator_verifications", "pg_temp.creator_verifications").replaceAll("storage.objects", "pg_temp.objects").replaceAll("public.has_role", "pg_temp.review_role").replaceAll("auth.uid()", "pg_temp.review_uid()"));
      const reviewer = crypto.randomUUID(); const uid = c.self ? reviewer : crypto.randomUUID(); const id = crypto.randomUUID();
      await sql`SELECT set_config('test.review_uid',${reviewer},true)`;
      if (c.admin !== false) await sql`INSERT INTO pg_temp.user_roles VALUES(${reviewer},'admin')`;
      await sql`INSERT INTO pg_temp.user_roles VALUES(${uid},'creator')`;
      const front = `${uid}/front.png`; const selfie = `${uid}/selfie.png`;
      await sql`INSERT INTO pg_temp.creator_verifications(id,user_id,status,date_of_birth,id_front_path,selfie_path,document_bucket) VALUES(${id},${uid},${c.initial ?? "pending"},${c.dob ?? "2000-01-01"},${front},${selfie},'identity-documents')`;
      await sql`INSERT INTO pg_temp.objects VALUES('identity-documents',${front}),('identity-documents',${selfie})`;
      const decision = c.decision ?? "approved";
      if (c.error) {
        await expect(sql`SELECT pg_temp.review_creator_identity(${id},${decision},${c.notes ?? ""},${c.confirmed !== false})`).rejects.toThrow(c.error);
      } else {
        const result = await sql`SELECT pg_temp.review_creator_identity(${id},${decision},${c.notes ?? ""},true) AS user_id`;
        expect(result[0].user_id).toBe(uid);
        const records = await sql`SELECT status,reviewer_id,reviewer_notes,identity_confirmed,reviewed_at IS NOT NULL AS timestamp FROM pg_temp.creator_verifications WHERE id=${id}`;
        expect(records[0]).toEqual({status:decision,reviewer_id:reviewer,reviewer_notes:c.notes ?? null,identity_confirmed:decision === "approved",timestamp:true});
      }
      throw rollback;
    }).catch(error => { if (error !== rollback) throw error; });
  },30000);
});
