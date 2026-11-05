// @vitest-environment node
import postgres from "postgres";
import { afterAll, expect, it } from "vitest";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
afterAll(async () => { await db?.end(); });
it.skipIf(!db)("founding country follows verified ID residence, never the claimed profile country; five slots per side", async () => {
  if (!db) throw Error("Database required");
  const rollback = Error("rollback");
  await db.begin(async sql => {
    await sql.unsafe(`CREATE TEMP TABLE profiles(user_id uuid,country text,vault_side text,verification_status text); CREATE TEMP TABLE creator_verifications(id uuid,user_id uuid,status text,identity_confirmed boolean,residence_country text,residence_id_confirmed boolean,residence_reviewed_by uuid,residence_reviewed_at timestamptz,document_expires_on date,reviewed_at timestamptz); CREATE TEMP TABLE founding_creators(creator_id uuid UNIQUE,country text,vault_side text,slot int,split_creator int,split_platform int,ends_at timestamptz); CREATE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS 'SELECT true';`);
    const [row] = await sql`select pg_get_functiondef('public.claim_founding_slot(uuid)'::regprocedure) d`;
    await sql.unsafe(row.d.replaceAll("public.", "pg_temp."));
    const u = crypto.randomUUID();
    await sql`insert into pg_temp.profiles values(${u},'CA','men','approved')`;
    await sql`insert into pg_temp.creator_verifications values(${crypto.randomUUID()},${u},'approved',true,'US',false,${crypto.randomUUID()},now(),current_date+1,now())`;
    await sql`select pg_temp.claim_founding_slot(${u})`;
    expect((await sql`select * from pg_temp.founding_creators`)).toHaveLength(0);
    await sql`update pg_temp.creator_verifications set residence_id_confirmed=true`;
    await sql`select pg_temp.claim_founding_slot(${u})`;
    expect((await sql`select country,slot,split_creator,split_platform from pg_temp.founding_creators`)[0]).toEqual({country:"US",slot:1,split_creator:91,split_platform:9});
    for (let i=0;i<5;i++) {
      const c=crypto.randomUUID();
      await sql`insert into pg_temp.profiles values(${c},'CA','men','approved')`;
      await sql`insert into pg_temp.creator_verifications values(${crypto.randomUUID()},${c},'approved',true,'US',true,${crypto.randomUUID()},now(),current_date+1,now())`;
      await sql`select pg_temp.claim_founding_slot(${c})`;
    }
    expect((await sql`select * from pg_temp.founding_creators`)).toHaveLength(5);
    throw rollback;
  }).catch(e => { if (e !== rollback) throw e; });
});