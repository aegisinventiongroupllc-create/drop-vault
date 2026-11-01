// @vitest-environment node
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false }) : null;
describe.skipIf(!db)("manual verification permissions", () => {
  afterAll(async () => { await db?.end(); });
  it("denies direct client submission and review writes", async () => {
    if (!db) throw Error("Database required");
    const rows = await db`SELECT has_table_privilege('authenticated','public.creator_verifications','INSERT') AS insert, has_table_privilege('authenticated','public.creator_verifications','UPDATE') AS update`;
    expect(rows[0]).toEqual({ insert: false, update: false });
  });
  it("denies anonymous review calls", async () => {
    if (!db) throw Error("Database required");
    const rows = await db`SELECT has_function_privilege('anon','public.review_creator_identity(uuid,text,text,boolean)','EXECUTE') AS allowed`;
    expect(rows[0].allowed).toBe(false);
  });
  it("rejects signed-out review before accessing a record", async () => {
    if (!db) throw Error("Database required");
    await expect(db`SELECT public.review_creator_identity(${crypto.randomUUID()},'approved','',true)`).rejects.toThrow("Administrator sign-in required");
  });
  it("keeps the identity bucket private and capped", async () => {
    if (!db) throw Error("Database required");
    const rows = await db`SELECT public,file_size_limit FROM storage.buckets WHERE id='identity-documents'`;
    expect(rows[0]).toEqual({ public: false, file_size_limit: 10485760 });
  });
});