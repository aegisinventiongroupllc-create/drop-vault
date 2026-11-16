// @vitest-environment node
import postgres from "postgres";
import { afterAll, expect, it } from "vitest";
import { CLEAN_TEMP_SCHEMA_SQL } from "./tempSchemaCleanup";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
afterAll(async () => { await db?.end(); });
it.skipIf(!db)("saves removable own tags, denies non-creators, and filters category/tag intersections before paging", async () => {
  if (!db) throw Error("Database required");
  const rollback = Error("rollback adaptive fixture");
  await db.begin(async sql => {
    await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
    await sql.unsafe(`CREATE TEMP TABLE profiles(LIKE public.profiles INCLUDING DEFAULTS INCLUDING CONSTRAINTS); CREATE TEMP TABLE public_profiles(LIKE public.public_profiles); CREATE TEMP TABLE creator_media(LIKE public.creator_media INCLUDING DEFAULTS); CREATE TEMP TABLE creator_heart_totals(creator_id uuid,hearts bigint); CREATE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.creator')='true' $$; CREATE FUNCTION pg_temp.get_creator_vip_status(uuid) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"priority_active":false}'::jsonb $$; CREATE FUNCTION pg_temp.get_active_teasers() RETURNS SETOF pg_temp.creator_media LANGUAGE sql AS $$ SELECT * FROM pg_temp.creator_media $$;`);
    for (const name of ["save_my_adaptive_tags","search_creator_adaptive","get_teaser_adaptive"]) {
      const [row] = await sql`SELECT pg_get_functiondef(oid) d FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=${name}`;
      let d = String(row.d).split("auth.uid()").join("current_setting('request.jwt.claim.sub')::uuid");
      for (const object of [name,"profiles","public_profiles","creator_media","creator_heart_totals","has_role","get_creator_vip_status","get_active_teasers"]) d = d.split(`public.${object}`).join(`pg_temp.${object}`);
      await sql.unsafe(d);
    }
    const user=crypto.randomUUID(), other=crypto.randomUUID();
    await sql`SELECT set_config('request.jwt.claim.sub',${user},true),set_config('test.creator','true',true)`;
    await sql`INSERT INTO pg_temp.profiles(user_id,email) VALUES(${user},'fixture'),(${other},'other')`;
    const tags=["adaptive-creator","mobility-aid-wheelchair-user","prosthetic-limb-difference","sensory-inclusive"];
    await sql`SELECT pg_temp.save_my_adaptive_tags(${tags})`;
    expect((await sql`SELECT adaptive_tags FROM pg_temp.profiles WHERE user_id=${user}`)[0].adaptive_tags.sort()).toEqual([...tags].sort());
    expect((await sql`SELECT adaptive_tags FROM pg_temp.profiles WHERE user_id=${other}`)[0].adaptive_tags).toEqual([]);
    await expect(sql.savepoint(tx=>tx`SELECT pg_temp.save_my_adaptive_tags(ARRAY['invalid'])`)).rejects.toThrow('INVALID_ADAPTIVE_TAGS');
    await sql`SELECT pg_temp.save_my_adaptive_tags('{}'::text[])`;
    expect((await sql`SELECT adaptive_tags FROM pg_temp.profiles WHERE user_id=${user}`)[0].adaptive_tags).toEqual([]);
    await sql`SELECT set_config('test.creator','false',true)`;
    await expect(sql.savepoint(tx=>tx`SELECT pg_temp.save_my_adaptive_tags(${tags})`)).rejects.toThrow('CREATOR_REQUIRED');
    for (const category of ["women","men","trans_women","trans_men"]) for (const adaptive of [true,false]) {
      const id=crypto.randomUUID();
      await sql`INSERT INTO pg_temp.public_profiles(user_id,display_name,role,vault_side,adaptive_tags) VALUES(${id},'Fixture','creator',${category},${adaptive?tags:[]})`;
      await sql`INSERT INTO pg_temp.creator_media(creator_id,bucket,storage_path,media_type,title) VALUES(${id},'teasers',${id},'video','Fixture')`;
    }
    expect((await sql`SELECT vault_side FROM pg_temp.search_creator_adaptive('',ARRAY['women','trans_men'],ARRAY['adaptive-creator'])`).map(r=>r.vault_side).sort()).toEqual(['trans_men','women']);
    expect(await sql`SELECT * FROM pg_temp.get_teaser_adaptive(ARRAY['women','trans_men'],ARRAY['adaptive-creator','sensory-inclusive'])`).toHaveLength(2);
    expect(await sql`SELECT * FROM pg_temp.get_teaser_adaptive('{}'::text[],ARRAY['adaptive-creator'])`).toHaveLength(0);
    expect(await sql`SELECT * FROM pg_temp.search_creator_adaptive('',ARRAY['women'],ARRAY['invalid'])`).toHaveLength(0);
    expect(await sql`SELECT * FROM pg_temp.search_creator_adaptive('',ARRAY['women'],'{}'::text[])`).toHaveLength(2);
    throw rollback;
  }).catch(error=>{if(error!==rollback)throw error;});
});
it.skipIf(!db)("adaptive tags confer no founder eligibility and anonymous saves are denied", async () => {
  if (!db) throw Error("Database required");
  const [row]=await db`SELECT has_function_privilege('anon','public.save_my_adaptive_tags(text[])','EXECUTE') anonymous,pg_get_functiondef('public.claim_founding_slot(uuid)'::regprocedure) definition`;
  expect(row.anonymous).toBe(false);
  expect(row.definition.includes('adaptive_tags')).toBe(false);
});