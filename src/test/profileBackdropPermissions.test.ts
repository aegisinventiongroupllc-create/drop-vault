// @vitest-environment node
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
describe.skipIf(!db)("profile backdrop authorization", () => {
  afterAll(async () => { await db?.end(); });
  it("keeps writes server-owned and denies anonymous reads", async () => {
    if (!db) throw Error("Database required");
    const rows = await db`SELECT has_table_privilege('authenticated','public.profile_backdrop_settings','INSERT') AS insert, has_table_privilege('authenticated','public.profile_backdrop_settings','UPDATE') AS update,has_table_privilege('anon','public.profile_backdrop_settings','SELECT') AS anon`;
    expect(rows[0]).toEqual({ insert: false, update: false, anon: false });
  });
  it("denies signed-out backdrop changes", async () => {
    if (!db) throw Error("Database required");
    await expect(db`SELECT public.set_my_profile_backdrop('spring',NULL)`).rejects.toThrow(/Sign in required/);
  });
  it("keeps images private and capped at 5 MB", async () => {
    if (!db) throw Error("Database required");
    const rows = await db`SELECT public,file_size_limit FROM storage.buckets WHERE id='profile-backdrops'`;
    expect(rows[0].public).toBe(false);
    expect(Number(rows[0].file_size_limit)).toBe(5242880);
  });
  it("rejects foreign-owned upload paths", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      await sql`SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true)`;
      await expect(sql`SELECT public.set_my_profile_backdrop(NULL,'22222222-2222-4222-8222-222222222222/backdrop-33333333-3333-4333-8333-333333333333.jpg')`).rejects.toThrow(/Invalid owned image/);
    }).catch(error => { if (!String(error).includes('current transaction is aborted')) throw error; });
  });
});