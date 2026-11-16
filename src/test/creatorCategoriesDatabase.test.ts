// @vitest-environment node
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { CLEAN_TEMP_SCHEMA_SQL } from "./tempSchemaCleanup";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
describe.skipIf(!db)("deployed category discovery", () => {
  afterAll(async () => { await db?.end(); });
  it("persists all four categories and restricts general search and teaser pages", async () => {
    if (!db) throw new Error("Database required");
    const rollback = new Error("rollback category fixture");
    await db.begin(async sql => {
      await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
      await sql.unsafe(`CREATE TEMP TABLE profiles (LIKE public.profiles INCLUDING DEFAULTS INCLUDING CONSTRAINTS); CREATE TEMP TABLE account_preferences (LIKE public.account_preferences INCLUDING DEFAULTS INCLUDING CONSTRAINTS); CREATE TEMP TABLE public_profiles (LIKE public.public_profiles); CREATE TEMP TABLE creator_media (LIKE public.creator_media INCLUDING DEFAULTS); CREATE TEMP TABLE creator_heart_totals (creator_id uuid,hearts bigint); CREATE FUNCTION pg_temp.get_creator_vip_status(uuid) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"priority_active":false}'::jsonb $$; CREATE FUNCTION pg_temp.get_active_teasers() RETURNS SETOF pg_temp.creator_media LANGUAGE sql AS $$ SELECT * FROM pg_temp.creator_media $$;`);
      for (const name of ["search_creator_page", "get_teaser_page"]) {
        const [row] = await sql`SELECT pg_get_functiondef(oid) definition FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=${name}`;
        let definition = String(row.definition);
        for (const object of [name,"public_profiles","creator_media","creator_heart_totals","get_creator_vip_status","get_active_teasers"]) definition = definition.split(`public.${object}`).join(`pg_temp.${object}`);
        await sql.unsafe(definition);
      }
      const categories = ["women", "men", "trans_women", "trans_men"];
      for (const side of categories) {
        const id = crypto.randomUUID();
        await sql`INSERT INTO profiles(user_id,email,vault_side) VALUES(${id},'fixture',${side})`;
        await sql`INSERT INTO account_preferences(user_id,email,customer_preference) VALUES(${id},'fixture',${side})`;
        await sql`INSERT INTO public_profiles(user_id,display_name,role,vault_side) VALUES(${id},'Fixture','creator',${side})`;
        await sql`INSERT INTO creator_media(creator_id,bucket,storage_path,media_type,title) VALUES(${id},'teasers',${id},'video','Fixture')`;
        expect((await sql`SELECT vault_side FROM profiles WHERE user_id=${id}`)[0].vault_side).toBe(side);
        expect((await sql`SELECT customer_preference FROM account_preferences WHERE user_id=${id}`)[0].customer_preference).toBe(side);
      }
      for (const filter of [null,"both"]) expect((await sql`SELECT vault_side FROM pg_temp.search_creator_page('Fixture',${filter})`).map(row => row.vault_side).sort()).toEqual(["men","women"]);
      for (const side of categories) {
        expect((await sql`SELECT vault_side FROM pg_temp.search_creator_page('Fixture',${side})`).map(row => row.vault_side)).toEqual([side]);
        expect(await sql`SELECT * FROM pg_temp.get_teaser_page(${side})`).toHaveLength(1);
      }
      throw rollback;
    }).catch(error => { if (error !== rollback) throw error; });
  });
});