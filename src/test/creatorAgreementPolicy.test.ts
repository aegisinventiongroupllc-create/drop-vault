// @vitest-environment node
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { CLEAN_TEMP_SCHEMA_SQL } from "./tempSchemaCleanup";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
describe.skipIf(!db)("owned creator agreement policy", () => {
  afterAll(async () => { await db?.end(); });
  it("allows only the signed-in creator's bounded agreement record", async () => {
    if (!db) return;
    await db.begin(async sql => {
      await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
      const [policy] = await sql`SELECT with_check FROM pg_policies WHERE schemaname='public' AND tablename='legal_consents' AND policyname='Creators record own agreement'`;
      expect(policy).toBeTruthy();
      await sql.unsafe("CREATE TEMP TABLE agreement_check (user_id uuid,consent_type text,consent_text text,terms_version text,email text,username text,ip_address text,user_agent text) ON COMMIT DROP");
      const user = crypto.randomUUID();
      await sql`SELECT set_config('test.user',${user},true),set_config('test.role','creator',true)`;
      await sql.unsafe("CREATE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS 'SELECT current_setting(''test.role'') = $2::text'");
      const expression = policy.with_check.replaceAll("auth.uid()", "current_setting('test.user')::uuid").replaceAll("has_role(", "pg_temp.has_role(");
      await sql`INSERT INTO agreement_check (user_id,consent_type,consent_text,terms_version) VALUES (${user},'creator_agreement','I agree','1.7')`;
      const allowed = async () => (await sql.unsafe(`SELECT ${expression} AS allowed FROM agreement_check`))[0].allowed;
      expect(await allowed()).toBe(true);
      await sql`UPDATE agreement_check SET user_id=${crypto.randomUUID()}`;
      expect(await allowed()).toBe(false);
      await sql`UPDATE agreement_check SET user_id=${user}`;
      await sql`SELECT set_config('test.role','customer',true)`;
      expect(await allowed()).toBe(false);
      await sql`SELECT set_config('test.role','creator',true)`;
      await sql`UPDATE agreement_check SET consent_text=${'x'.repeat(5001)}`;
      expect(await allowed()).toBe(false);
    });
  });
});