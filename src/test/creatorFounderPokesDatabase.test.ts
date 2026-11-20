// @vitest-environment node
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { CLEAN_TEMP_SCHEMA_SQL } from "./tempSchemaCleanup";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
async function fixture(sql: postgres.TransactionSql) {
  await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
  await sql.unsafe("CREATE TEMP TABLE creator_founder_pokes (LIKE public.creator_founder_pokes INCLUDING ALL) ON COMMIT DROP; CREATE TEMP TABLE profiles (LIKE public.profiles INCLUDING DEFAULTS) ON COMMIT DROP; CREATE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.role')=$2::text $$");
  for (const name of ["my_founder_poke", "admin_founder_poke_top_ten"]) {
    const [row] = await sql`SELECT pg_get_functiondef(oid) AS d FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=${name}`;
    let body = String(row.d).split("auth.uid()").join("current_setting('test.creator')::uuid");
    for (const object of [name, "has_role", "creator_founder_pokes", "profiles"]) body = body.split(`public.${object}`).join(`pg_temp.${object}`);
    await sql.unsafe(body);
  }
  await sql`SELECT set_config('test.creator',${crypto.randomUUID()},true),set_config('test.role','creator',true)`;
}
describe.skipIf(!db)("daily founder poke rules", () => {
  afterAll(async () => { await db?.end(); });
  it("records only one poke each New York day and preserves the first receipt on retry", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      await fixture(sql);
      const [before] = await sql`SELECT pg_temp.my_founder_poke(false) AS r`;
      expect(before.r.days).toBe(0); expect(before.r.received_at).toBeNull();
      const [first] = await sql`SELECT pg_temp.my_founder_poke(true) AS r`;
      const [retry] = await sql`SELECT pg_temp.my_founder_poke(true) AS r`;
      expect(first.r.days).toBe(1); expect(first.r.received_at).not.toBeNull();
      expect(retry.r).toEqual(first.r);
      const [day] = await sql`SELECT (now() AT TIME ZONE 'America/New_York')::date::text AS d`;
      expect(first.r.day).toBe(day.d);
      expect(await sql`SELECT * FROM pg_temp.creator_founder_pokes`).toHaveLength(1);
    });
  });
  it("includes exactly 365 days, ranks only 10 creators and marks full-year participation as 365", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      await fixture(sql);
      const leader = crypto.randomUUID();
      await sql`INSERT INTO pg_temp.creator_founder_pokes(creator_id,poke_day) SELECT ${leader},(now() AT TIME ZONE 'America/New_York')::date-i FROM generate_series(0,365) i`;
      for (let i = 1; i <= 11; i++) {
        const id = crypto.randomUUID();
        await sql`INSERT INTO pg_temp.creator_founder_pokes(creator_id,poke_day) SELECT ${id},(now() AT TIME ZONE 'America/New_York')::date-j FROM generate_series(0,${i-1}) j`;
      }
      await sql`SELECT set_config('test.creator',${leader},true)`;
      const [own] = await sql`SELECT pg_temp.my_founder_poke(false) AS r`;
      expect(own.r.days).toBe(365);
      await sql`SELECT set_config('test.role','admin',true)`;
      const [rank] = await sql`SELECT pg_temp.admin_founder_poke_top_ten() AS r`;
      expect(rank.r.entries).toHaveLength(10);
      expect(rank.r.entries[0].creator_id).toBe(leader); expect(rank.r.entries[0].days).toBe(365);
      expect(rank.r.entries[1].days).toBe(11); expect(rank.r.today_total).toBe(12);
      const [historical] = await sql`SELECT pg_temp.admin_founder_poke_top_ten((now() AT TIME ZONE 'America/New_York')::date-1) AS r`;
      expect(historical.r.entries[0].days).toBe(365);
    });
  });
  it("denies customer pokes and creator access to the private administrator ranking", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      await fixture(sql);
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.admin_founder_poke_top_ten()`)).rejects.toThrow("Administrator account required");
      await sql`SELECT set_config('test.role','customer',true)`;
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.my_founder_poke(true)`)).rejects.toThrow("Creator account required");
    });
    for (const privilege of ["INSERT", "UPDATE", "DELETE"]) {
      const [row] = await db`SELECT has_table_privilege('authenticated','public.creator_founder_pokes',${privilege}) AS ok`;
      expect(row.ok).toBe(false);
    }
    for (const signature of ["public.my_founder_poke(boolean)", "public.admin_founder_poke_top_ten(date)"]) {
      const [row] = await db`SELECT has_function_privilege('anon',${signature},'EXECUTE') AS ok`;
      expect(row.ok).toBe(false);
    }
    const [row] = await db`SELECT relrowsecurity AS enabled FROM pg_class WHERE oid='public.creator_founder_pokes'::regclass`;
    expect(row.enabled).toBe(true);
  });
  it("review-only pokes leave the creator revenue settings unchanged", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      await fixture(sql);
      const before = await sql`SELECT md5(coalesce(string_agg(row_to_json(s)::text,',' ORDER BY creator_id),'')) AS hash FROM public.creator_split_settings s`;
      await sql`SELECT pg_temp.my_founder_poke(true)`;
      const after = await sql`SELECT md5(coalesce(string_agg(row_to_json(s)::text,',' ORDER BY creator_id),'')) AS hash FROM public.creator_split_settings s`;
      expect(after[0].hash).toBe(before[0].hash);
    });
  });
});