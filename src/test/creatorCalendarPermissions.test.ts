// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
describe.skipIf(!db)('Creator calendar privacy', () => {
  afterAll(async () => { await db?.end(); });
  it('enforces creator role and ownership and denies anonymous table access', async () => {
    if (!db) throw new Error('Database unavailable');
    const [table] = await db`SELECT relrowsecurity FROM pg_class WHERE oid='public.creator_calendar_items'::regclass`;
    expect(table.relrowsecurity).toBe(true);
    const [grant] = await db`SELECT has_table_privilege('anon','public.creator_calendar_items','SELECT') AS allowed`;
    expect(grant.allowed).toBe(false);
    const [policy] = await db`SELECT qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename='creator_calendar_items'`;
    expect(policy.qual).toContain('creator_id = auth.uid()');
    expect(policy.qual).toContain("has_role(auth.uid(), 'creator'");
    expect(policy.with_check).toBe(policy.qual);
  });
  it('server stamps both-party agreement and rejects caller-written agreement times', async () => {
    if (!db) throw new Error('Database unavailable');
    const rollback = new Error('rollback');
    await expect(db.begin(async sql => {
      await sql.unsafe('CREATE TEMP TABLE calendar_test_requests (LIKE public.custom_requests INCLUDING ALL)');
      const [fn] = await sql`SELECT pg_get_functiondef('public.stamp_request_calendar_agreement()'::regprocedure) AS body`;
      await sql.unsafe(fn.body.replace('public.stamp_request_calendar_agreement()', 'pg_temp.stamp_agreement()'));
      await sql.unsafe('CREATE TRIGGER calendar_stamp BEFORE INSERT OR UPDATE ON pg_temp.calendar_test_requests FOR EACH ROW EXECUTE FUNCTION pg_temp.stamp_agreement()');
      const id = crypto.randomUUID();
      await sql`INSERT INTO pg_temp.calendar_test_requests (id,customer_id,description,amount_usd,tokens,creator_share_usd,platform_share_usd,status) VALUES (${id},${crypto.randomUUID()},'test',20,1,18,2,'countered')`;
      await sql`UPDATE pg_temp.calendar_test_requests SET status='accepted' WHERE id=${id}`;
      const [row] = await sql`SELECT calendar_agreed_at = now() AS stamped, fulfillment_deadline FROM pg_temp.calendar_test_requests WHERE id=${id}`;
      expect(row.stamped).toBe(true); expect(row.fulfillment_deadline).toBeNull();
      await expect(sql.savepoint(tx => tx`UPDATE pg_temp.calendar_test_requests SET calendar_agreed_at=now()+interval '1 day' WHERE id=${id}`)).rejects.toThrow();
      throw rollback;
    })).rejects.toBe(rollback);
  });
});