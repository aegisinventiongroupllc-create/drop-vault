// @vitest-environment node
import postgres from "postgres";
import { afterAll, expect, it } from "vitest";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
afterAll(async () => { await db?.end(); });
it.skipIf(!db)("public badge reads are available but anonymous writes are denied", async () => {
  if (!db) throw Error("Database required");
  const [r] = await db`select has_table_privilege('anon','public.creator_debut_badges','SELECT') readable, has_table_privilege('anon','public.creator_debut_badges','INSERT') writable, relrowsecurity secured from pg_class where oid='public.creator_debut_badges'::regclass`;
  expect(r.readable).toBe(true); expect(r.writable).toBe(false); expect(r.secured).toBe(true);
});
it.skipIf(!db)("the edit policy excludes a different signed-in creator", async () => {
  if (!db) throw Error("Database required");
  const [policy] = await db`select qual from pg_policies where schemaname='public' and tablename='creator_debut_badges' and cmd='UPDATE'`;
  const expression = String(policy.qual).split("auth.uid()").join("'42327ab8-4372-4aef-8f8d-5325ad1ffd9f'::uuid");
  const rows = await db.unsafe(`select ${expression} permitted from (select '00000000-0000-0000-0000-000000000001'::uuid user_id) fixture`);
  expect(rows[0].permitted).toBe(false);
});