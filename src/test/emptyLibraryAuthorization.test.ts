// @vitest-environment node
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
describe.skipIf(!db)("empty library server authorization", () => {
  afterAll(async () => { await db?.end(); });
  it("rejects an empty library before balance or ledger changes", async () => {
    if (!db) throw new Error("Database required");
    const rollback = new Error("rollback fixture");
    await db.begin(async sql => {
      const rows = await sql`SELECT pg_get_functiondef('public.unlock_creator(uuid)'::regprocedure) AS definition`;
      let definition = rows[0].definition.replace('public.unlock_creator(', 'pg_temp.test_unlock(').replaceAll('auth.uid()', "current_setting('request.jwt.claim.sub')::uuid");
      // Keep the deployed empty-library guard, but redirect media to an empty temporary fixture.
      await sql`CREATE TEMP TABLE creator_media (LIKE public.creator_media INCLUDING DEFAULTS)`;
      await sql`CREATE TEMP TABLE storage_objects (bucket_id text, name text)`;
      definition = definition.replaceAll('public.creator_media', 'pg_temp.creator_media').replaceAll('storage.objects', 'pg_temp.storage_objects');
      await sql.unsafe(definition);
      const user = crypto.randomUUID(), creator = crypto.randomUUID();
      await sql`SELECT set_config('request.jwt.claim.sub',${user},true), set_config('request.jwt.claims',${JSON.stringify({sub:user,role:'authenticated'})},true)`;
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.test_unlock(${creator})`)).rejects.toThrow('LIBRARY_EMPTY');
      const state = await sql`SELECT (SELECT count(*) FROM public.transactions WHERE buyer_id=${user}) AS ledger, (SELECT count(*) FROM public.subscriptions WHERE customer_id=${user}) AS access`;
      expect(Number(state[0].ledger)).toBe(0);
      expect(Number(state[0].access)).toBe(0);
      throw rollback;
    }).catch(error => { if (error !== rollback) throw error; });
  });
});