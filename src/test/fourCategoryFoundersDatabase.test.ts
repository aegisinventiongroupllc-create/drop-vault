// @vitest-environment node
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { CLEAN_TEMP_SCHEMA_SQL } from "./tempSchemaCleanup";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
afterAll(async () => { await db?.end(); });
const categories = ["women", "men", "trans_women", "trans_men"] as const;
describe.skipIf(!db)("verified four-category founding allocation", () => {
  async function fixture(run: (sql: postgres.TransactionSql) => Promise<void>) {
    if (!db) throw Error("Database required");
    const rollback = Error("rollback founders");
    await db.begin(async sql => {
      await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
      await sql.unsafe(`CREATE TEMP TABLE profiles(user_id uuid PRIMARY KEY,country text,vault_side text,verification_status text,role text DEFAULT 'creator',content_labels text[] DEFAULT ARRAY['solo']); CREATE TEMP TABLE creator_verifications(id uuid,user_id uuid,status text,identity_confirmed boolean,residence_country text,residence_id_confirmed boolean,residence_reviewed_by uuid,residence_reviewed_at timestamptz,document_expires_on date,reviewed_at timestamptz); CREATE TEMP TABLE founding_creators(LIKE public.founding_creators INCLUDING ALL); CREATE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS 'SELECT true';`);
      for (const name of ["claim_founding_slot", "claim_founding_slot_trigger"]) {
        const [row] = await sql`SELECT pg_get_functiondef(oid) d FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=${name}`;
        await sql.unsafe(String(row.d).split("public.").join("pg_temp."));
      }
      await sql.unsafe(`CREATE TRIGGER founder_onboarding AFTER INSERT OR UPDATE OF verification_status,vault_side,content_labels ON pg_temp.profiles FOR EACH ROW EXECUTE FUNCTION pg_temp.claim_founding_slot_trigger()`);
      await run(sql);
      throw rollback;
    }).catch(error => { if (error !== rollback) throw error; });
  }
  async function approved(sql: postgres.TransactionSql, category: string, country = "US", labels = ["solo"]) {
    const id = crypto.randomUUID();
    await sql`INSERT INTO pg_temp.creator_verifications VALUES(${crypto.randomUUID()},${id},'approved',true,${country},true,${crypto.randomUUID()},now(),current_date+1,now())`;
    await sql`INSERT INTO pg_temp.profiles(user_id,country,vault_side,verification_status,content_labels) VALUES(${id},'CA',${category},'approved',${labels})`;
    return id;
  }
  it.each(categories)("automatically awards exactly the first five %s lifetime 91/9", async category => fixture(async sql => {
    const ids = [];
    for (let i = 0; i < 6; i++) ids.push(await approved(sql, category));
    const rows = await sql`SELECT creator_id,slot,split_creator,split_platform,extract(year FROM ends_at)::int lifetime FROM pg_temp.founding_creators ORDER BY slot`;
    expect(rows.map(row => row.creator_id)).toEqual(ids.slice(0,5));
    expect(rows.map(row => [row.slot,row.split_creator,row.split_platform,row.lifetime])).toEqual([1,2,3,4,5].map(slot => [slot,91,9,9999]));
  }));
  it("keeps four country/category pools independent: twenty places per country", async () => fixture(async sql => {
    for (const country of ["US","GB"]) for (const category of categories) for (let i=0;i<6;i++) await approved(sql, category, country);
    const rows = await sql`SELECT country,count(*)::int n FROM pg_temp.founding_creators GROUP BY country ORDER BY country`;
    expect(rows).toEqual([{country:"GB",n:20},{country:"US",n:20}]);
  }));
  it("category changes and repeated claims preserve the original award and split", async () => fixture(async sql => {
    const id = await approved(sql,"women");
    await sql`UPDATE pg_temp.founding_creators SET split_creator=92,split_platform=8 WHERE creator_id=${id}`;
    await sql`UPDATE pg_temp.profiles SET vault_side='trans_women' WHERE user_id=${id}`;
    await sql`SELECT pg_temp.claim_founding_slot(${id})`;
    expect(await sql`SELECT vault_side,slot,split_creator,split_platform FROM pg_temp.founding_creators`).toEqual([{vault_side:"women",slot:1,split_creator:92,split_platform:8}]);
  }));
  it("waits for category labels and verified approval before allocating", async () => fixture(async sql => {
    const id = await approved(sql,"trans_men","US",[]);
    expect(await sql`SELECT * FROM pg_temp.founding_creators`).toHaveLength(0);
    await sql`UPDATE pg_temp.profiles SET verification_status='pending',content_labels=ARRAY['solo'] WHERE user_id=${id}`;
    expect(await sql`SELECT * FROM pg_temp.founding_creators`).toHaveLength(0);
    await sql`UPDATE pg_temp.profiles SET verification_status='approved' WHERE user_id=${id}`;
    expect(await sql`SELECT country,vault_side,slot FROM pg_temp.founding_creators`).toEqual([{country:"US",vault_side:"trans_men",slot:1}]);
  }));
  it("denies direct customer and creator award allocation", async () => {
    if (!db) throw Error("Database required");
    const [row] = await db`SELECT has_function_privilege('anon','public.claim_founding_slot(uuid)','EXECUTE') a,has_function_privilege('authenticated','public.claim_founding_slot(uuid)','EXECUTE') c`;
    expect(row).toEqual({a:false,c:false});
  });
});