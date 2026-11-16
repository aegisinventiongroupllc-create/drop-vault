// @vitest-environment node
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { CLEAN_TEMP_SCHEMA_SQL } from "./tempSchemaCleanup";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
describe.skipIf(!db)("saved multi-select discovery", () => {
  afterAll(async () => { await db?.end(); });
  it("requires creator labels, saves only own preferences, and queries exact category unions", async () => {
    if (!db) throw new Error("Database required");
    const rollback = new Error("fixture rollback");
    await db.begin(async sql => {
      await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
      await sql.unsafe(`CREATE TEMP TABLE profiles (LIKE public.profiles INCLUDING DEFAULTS INCLUDING CONSTRAINTS); CREATE TEMP TABLE account_preferences (LIKE public.account_preferences INCLUDING DEFAULTS INCLUDING CONSTRAINTS); CREATE TEMP TABLE public_profiles (LIKE public.public_profiles); CREATE TEMP TABLE creator_media (LIKE public.creator_media INCLUDING DEFAULTS); CREATE TEMP TABLE creator_heart_totals(creator_id uuid,hearts bigint); CREATE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.creator')='true' $$; CREATE FUNCTION pg_temp.get_creator_vip_status(uuid) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"priority_active":false}'::jsonb $$; CREATE FUNCTION pg_temp.get_active_teasers() RETURNS SETOF pg_temp.creator_media LANGUAGE sql AS $$ SELECT * FROM pg_temp.creator_media $$;`);
      for (const name of ["save_my_content_preferences","save_my_creator_discovery","search_creator_categories","get_teaser_categories"]) {
        const [row] = await sql`SELECT pg_get_functiondef(oid) definition FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=${name}`;
        let definition = String(row.definition).split("auth.uid()").join("current_setting('request.jwt.claim.sub')::uuid");
        for (const object of [name,"profiles","account_preferences","public_profiles","creator_media","creator_heart_totals","has_role","get_creator_vip_status","get_active_teasers"]) definition = definition.split(`public.${object}`).join(`pg_temp.${object}`);
        await sql.unsafe(definition);
      }
      const user=crypto.randomUUID(),other=crypto.randomUUID();
      await sql`SELECT set_config('request.jwt.claim.sub',${user},true),set_config('test.creator','true',true)`;
      await sql`INSERT INTO profiles(user_id,email) VALUES(${user},'fixture')`;
      await sql`INSERT INTO account_preferences(user_id,email) VALUES(${user},'fixture'),(${other},'other')`;
      await expect(sql.savepoint(tx=>tx`SELECT pg_temp.save_my_creator_discovery('women','{}'::text[])`)).rejects.toThrow("CONTENT_LABELS_REQUIRED");
      await expect(sql.savepoint(tx=>tx`SELECT pg_temp.save_my_creator_discovery(NULL,ARRAY['dance'])`)).rejects.toThrow("PROFILE_CATEGORY_REQUIRED");
      await sql`SELECT pg_temp.save_my_creator_discovery('trans_women',ARRAY['twerking','penis-visible'])`;
      expect((await sql`SELECT vault_side,content_labels FROM profiles WHERE user_id=${user}`)[0]).toMatchObject({vault_side:"trans_women",content_labels:["twerking","penis-visible"]});
      await sql`SELECT set_config('test.creator','false',true)`;
      await expect(sql.savepoint(tx=>tx`SELECT pg_temp.save_my_creator_discovery('men',ARRAY['dance'])`)).rejects.toThrow("CREATOR_REQUIRED");
      await sql`SELECT pg_temp.save_my_content_preferences(ARRAY['women','trans_men'])`;
      expect((await sql`SELECT content_categories FROM account_preferences WHERE user_id=${user}`)[0].content_categories.sort()).toEqual(["trans_men","women"]);
      expect((await sql`SELECT content_categories FROM account_preferences WHERE user_id=${other}`)[0].content_categories).toBeNull();
      for (const side of ["women","men","trans_women","trans_men"]) { const id=crypto.randomUUID(); await sql`INSERT INTO public_profiles(user_id,display_name,role,vault_side,tags) VALUES(${id},'Fixture','creator',${side},ARRAY['dance'])`; await sql`INSERT INTO creator_media(creator_id,bucket,storage_path,media_type,title) VALUES(${id},'teasers',${id},'video','Fixture')`; }
      for (const selection of [[],["women","trans_men"],["women","men","trans_women","trans_men"]]) {
        const rows=await sql`SELECT vault_side FROM pg_temp.search_creator_categories('dance',${selection})`;
        expect(rows.map(row=>row.vault_side).sort()).toEqual([...selection].sort());
        expect(await sql`SELECT * FROM pg_temp.get_teaser_categories(${selection})`).toHaveLength(selection.length);
      }
      await sql`SELECT pg_temp.save_my_content_preferences('{}'::text[])`;
      expect((await sql`SELECT content_categories FROM account_preferences WHERE user_id=${user}`)[0].content_categories).toEqual([]);
      await expect(sql.savepoint(tx=>tx`SELECT pg_temp.save_my_content_preferences(ARRAY['invalid'])`)).rejects.toThrow("INVALID_CATEGORIES");
      throw rollback;
    }).catch(error=>{if(error!==rollback)throw error;});
  });
});