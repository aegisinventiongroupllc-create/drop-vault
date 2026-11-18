// @vitest-environment node
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
describe.skipIf(!db)("private security access alerts", () => {
  afterAll(async () => { await db?.end(); });
  it("denies visitor reads and all client alert writes", async () => {
    if (!db) throw new Error("Connection required");
    const [row] = await db`select has_table_privilege('anon','public.security_access_events','SELECT') as visitor_read,
      has_table_privilege('authenticated','public.security_access_events','INSERT') as client_insert,
      has_table_privilege('authenticated','public.security_access_events','UPDATE') as client_update,
      has_table_privilege('authenticated','public.security_access_events','DELETE') as client_delete`;
    expect(row).toEqual({ visitor_read: false, client_insert: false, client_update: false, client_delete: false });
  });
  it("requires a server-verified administrator for alert reads", async () => {
    if (!db) throw new Error("Connection required");
    const rows = await db`select roles,cmd,qual from pg_policies where schemaname='public' and tablename='security_access_events'`;
    expect(rows).toHaveLength(1);
    expect(rows[0].roles).toEqual(["authenticated"]);
    expect(rows[0].cmd).toBe("SELECT");
    expect(rows[0].qual).toMatch(/has_role\(auth.uid\(\), 'admin'/);
  });
  it("enables row-level restrictions on the alert table", async () => {
    if (!db) throw new Error("Connection required");
    const [row] = await db`select relrowsecurity from pg_class where oid='public.security_access_events'::regclass`;
    expect(row.relrowsecurity).toBe(true);
  });
});