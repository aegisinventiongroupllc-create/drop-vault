// @vitest-environment node
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { CLEAN_TEMP_SCHEMA_SQL } from "./tempSchemaCleanup";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
const tables = ["creator_vip_interest", "account_bans", "creator_consent_withdrawals", "creator_split_settings"];
async function fixture(sql: postgres.TransactionSql) {
  await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
  for (const table of tables) await sql.unsafe(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL) ON COMMIT DROP`);
  await sql.unsafe("CREATE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS 'SELECT true'");
  const [row] = await sql`SELECT pg_get_functiondef('public.my_vip_interest(text,public.vip_pass_type)'::regprocedure) AS d`;
  let body = row.d.replaceAll("public.my_vip_interest", "pg_temp.my_vip_interest").replaceAll("public.has_role", "pg_temp.has_role").replaceAll("auth.uid()", "current_setting('test.creator')::uuid");
  for (const table of tables) body = body.replaceAll(`public.${table}`, `pg_temp.${table}`);
  await sql.unsafe(body);
  await sql`SELECT set_config('test.creator',${crypto.randomUUID()},true)`;
}
describe.skipIf(!db)("private VIP interest", () => {
  afterAll(async () => { await db?.end(); });
  it("one creator has one position across Pro and Elite, and retries preserve it", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      await fixture(sql);
      const [first] = await sql`SELECT pg_temp.my_vip_interest('join','PRO_PASS') AS r`;
      const [retry] = await sql`SELECT pg_temp.my_vip_interest('join','PRO_PASS') AS r`;
      const [change] = await sql`SELECT pg_temp.my_vip_interest('join','ELITE_PASS') AS r`;
      expect(first.r.entry.position).toBe(1); expect(retry.r.entry.position).toBe(1);
      expect(change.r.entry).toMatchObject({ pass_type: "ELITE_PASS", position: 1, ticket_id: first.r.entry.ticket_id, joined_at: first.r.entry.joined_at }); expect(change.r.joined).toBe(1);
      expect(first.r.entry.ticket_id).toBe("1");
      const [reload] = await sql`SELECT pg_temp.my_vip_interest('status') AS r`;
      expect(reload.r.entry).toEqual(change.r.entry);
      const [benefits] = await sql`SELECT count(*)::int AS n FROM pg_temp.creator_split_settings`;
      expect(benefits.n).toBe(0);
    });
  });
  it("limits the shared list to exactly 1,000 without granting a pass", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      await fixture(sql);
      await sql`INSERT INTO pg_temp.creator_vip_interest(creator_id,pass_type) SELECT gen_random_uuid(),'PRO_PASS' FROM generate_series(1,999)`;
      const [last] = await sql`SELECT pg_temp.my_vip_interest('join','ELITE_PASS') AS r`;
      expect(last.r.entry.position).toBe(1000); expect(last.r.capacity).toBe(1000);
      await sql`SELECT set_config('test.creator',${crypto.randomUUID()},true)`;
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.my_vip_interest('join','PRO_PASS')`)).rejects.toThrow("waiting list is full");
    });
  });
  it("leaving frees a place and rejoining goes to the back", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      await fixture(sql);
      await sql`SELECT pg_temp.my_vip_interest('join','PRO_PASS')`;
      await sql`INSERT INTO pg_temp.creator_vip_interest(creator_id,pass_type) VALUES(gen_random_uuid(),'ELITE_PASS')`;
      const [left] = await sql`SELECT pg_temp.my_vip_interest('leave') AS r`; expect(left.r.entry).toBeNull();
      const [again] = await sql`SELECT pg_temp.my_vip_interest('join','PRO_PASS') AS r`; expect(again.r.entry.position).toBe(2);
    });
  });
  it("denies customers and disallows direct member writes", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      await fixture(sql);
      await sql.unsafe("CREATE OR REPLACE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS 'SELECT false'");
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.my_vip_interest('status')`)).rejects.toThrow("Eligible creator required");
    });
    for (const privilege of ["INSERT", "UPDATE", "DELETE"]) {
      const [r] = await db`SELECT has_table_privilege('authenticated','public.creator_vip_interest',${privilege}) AS ok`; expect(r.ok).toBe(false);
    }
    const [r] = await db`SELECT has_function_privilege('anon','public.my_vip_interest(text,public.vip_pass_type)','EXECUTE') AS ok`; expect(r.ok).toBe(false);
  });
});