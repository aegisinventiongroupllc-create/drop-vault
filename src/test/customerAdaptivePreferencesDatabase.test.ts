// @vitest-environment node
import postgres from "postgres";
import { afterAll, expect, it } from "vitest";
import { CLEAN_TEMP_SCHEMA_SQL } from "./tempSchemaCleanup";

const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
afterAll(async () => { await db?.end(); });

it.skipIf(!db)("saves private own category and adaptive preferences atomically, with optional removal", async () => {
  if (!db) throw Error("Database required");
  const rollback = Error("rollback customer browsing fixture");
  await db.begin(async sql => {
    await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
    await sql.unsafe("CREATE TEMP TABLE account_preferences(LIKE public.account_preferences INCLUDING DEFAULTS INCLUDING CONSTRAINTS)");
    const [row] = await sql`SELECT pg_get_functiondef('public.save_my_browsing_preferences(text[],text[])'::regprocedure) AS definition`;
    await sql.unsafe(String(row.definition).split("public.save_my_browsing_preferences").join("pg_temp.save_my_browsing_preferences").split("public.account_preferences").join("pg_temp.account_preferences").split("auth.uid()").join("nullif(current_setting('request.jwt.claim.sub'), '')::uuid"));
    const user = crypto.randomUUID(), other = crypto.randomUUID();
    await sql`INSERT INTO pg_temp.account_preferences(user_id,email) VALUES(${user},'fixture'),(${other},'other')`;
    await sql`SELECT set_config('request.jwt.claim.sub',${user},true)`;
    const tags = ["adaptive-creator","mobility-aid-wheelchair-user","prosthetic-limb-difference","sensory-inclusive","plus-size-curvy","petite","muscle-athletic","mature","custom-request-friendly"];
    await sql`SELECT pg_temp.save_my_browsing_preferences(ARRAY['women','trans_men'],${tags})`;
    expect((await sql`SELECT content_categories,adaptive_preferences FROM pg_temp.account_preferences WHERE user_id=${user}`)[0]).toEqual({content_categories:["trans_men","women"],adaptive_preferences:[...tags].sort()});
    expect((await sql`SELECT content_categories,adaptive_preferences FROM pg_temp.account_preferences WHERE user_id=${other}`)[0]).toEqual({content_categories:null,adaptive_preferences:[]});
    await expect(sql.savepoint(tx => tx`SELECT pg_temp.save_my_browsing_preferences(ARRAY['men'],ARRAY['invalid'])`)).rejects.toThrow("INVALID_ADAPTIVE_TAGS");
    expect((await sql`SELECT content_categories FROM pg_temp.account_preferences WHERE user_id=${user}`)[0].content_categories).toEqual(["trans_men","women"]);
    await sql`SELECT pg_temp.save_my_browsing_preferences('{}'::text[],'{}'::text[])`;
    expect((await sql`SELECT content_categories,adaptive_preferences FROM pg_temp.account_preferences WHERE user_id=${user}`)[0]).toEqual({content_categories:[],adaptive_preferences:[]});
    await sql`SELECT set_config('request.jwt.claim.sub','',true)`;
    await expect(sql.savepoint(tx => tx`SELECT pg_temp.save_my_browsing_preferences(ARRAY['women'],'{}'::text[])`)).rejects.toThrow("SIGN_IN_REQUIRED");
    throw rollback;
  }).catch(error => { if(error !== rollback) throw error; });
});

it.skipIf(!db)("keeps adaptive browsing out of public profiles and denies anonymous saves", async () => {
  if (!db) throw Error("Database required");
  const [row] = await db`SELECT has_function_privilege('anon','public.save_my_browsing_preferences(text[],text[])','EXECUTE') AS anonymous_save`;
  expect(row.anonymous_save).toBe(false);
  const columns = await db`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='public_profiles' AND column_name='adaptive_preferences'`;
  expect(columns).toHaveLength(0);
  const policies = await db`SELECT qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='account_preferences'`;
  expect(policies).toHaveLength(2);
  expect(policies.every(row => String(row.qual).includes('auth.uid() = user_id'))).toBe(true);
});