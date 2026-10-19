// @vitest-environment node
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";

const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false }) : null;
const rollback = new Error("rollback test fixture");

describe.skipIf(!db)("live entry-pass server authorization", () => {
  // Sandbox cannot assume service_role or access auth.role(). Test deployed
  // business logic in temporary tables, substituting only the auth role reader.
  const setup = async (sql: postgres.TransactionSql) => {
    const rows = await sql`SELECT pg_get_functiondef('public.credit_entry_pass(uuid,text,numeric,text)'::regprocedure) AS definition`;
    await sql.unsafe('DROP TABLE IF EXISTS pg_temp.entry_pass_payment_receipts; DROP TABLE IF EXISTS pg_temp.entry_passes');
    await sql`CREATE TEMP TABLE entry_pass_payment_receipts (LIKE public.entry_pass_payment_receipts INCLUDING ALL)`;
    await sql`CREATE TEMP TABLE entry_passes (LIKE public.entry_passes INCLUDING ALL)`;
    await sql.unsafe(rows[0].definition
      .replace('public.credit_entry_pass(', 'pg_temp.test_credit_entry_pass(')
      .replaceAll('public.entry_pass_payment_receipts', 'pg_temp.entry_pass_payment_receipts')
      .replaceAll('public.entry_passes', 'pg_temp.entry_passes')
      .replaceAll('auth.role()', "(current_setting('request.jwt.claims', true)::jsonb->>'role')"));
  };
  afterAll(async () => { await db?.end(); });

  it.each(["anon", "authenticated"])("denies %s RPC execution and receipt writes", async role => {
    if (!db) throw Error("Database required");
    const rows = await db`SELECT has_function_privilege(${role}, 'public.credit_entry_pass(uuid,text,numeric,text)', 'EXECUTE') AS execute,
      has_table_privilege(${role}, 'public.entry_pass_payment_receipts', 'INSERT') AS insert,
      has_table_privilege(${role}, 'public.entry_pass_payment_receipts', 'UPDATE') AS update`;
    expect(rows[0]).toMatchObject({ execute: false, insert: false, update: false });
  });

  it("checks server authorization inside the function even for a privileged connection", async () => {
    if (!db) throw Error("Database required");
    await expect(db.begin(async sql => {
      await setup(sql);
      await sql`SELECT set_config('request.jwt.claims', '{"role":"authenticated"}', true)`;
      await sql`SELECT pg_temp.test_credit_entry_pass(gen_random_uuid(), 'guard-test', 20, 'crypto')`;
    })).rejects.toMatchObject({ code: "42501" });
  });

  it("denies an unpaid attempt even from the server role", async () => {
    if (!db) throw Error("Database required");
    await expect(db.begin(async sql => {
      await setup(sql);
      await sql`SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true)`;
      await sql`SELECT pg_temp.test_credit_entry_pass(gen_random_uuid(), 'unpaid-test', 20, 'crypto')`;
    })).rejects.toMatchObject({ code: "42501" });
  });

  it("rejects a pending receipt, a different buyer and a wrong amount without creating access", async () => {
    if (!db) throw Error("Database required");
    const outcome = await db.begin(async sql => {
      await setup(sql);
      const uid = crypto.randomUUID();
      const id = `security-test-${crypto.randomUUID()}`;
      await sql`SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true)`;
      await sql`INSERT INTO pg_temp.entry_pass_payment_receipts(payment_id,user_id,order_id,method,amount_usd)
        VALUES (${id},${uid},${id},'crypto',20)`;
      await expect(sql.savepoint(async tx => {
        await tx`SELECT pg_temp.test_credit_entry_pass(${uid},${id},20,'crypto')`;
      })).rejects.toMatchObject({ code: "42501" });
      await sql`UPDATE pg_temp.entry_pass_payment_receipts SET verified_at=now() WHERE payment_id=${id}`;
      await expect(sql.savepoint(async tx => {
        await tx`SELECT pg_temp.test_credit_entry_pass(gen_random_uuid(),${id},20,'crypto')`;
      })).rejects.toMatchObject({ code: "42501" });
      await expect(sql.savepoint(async tx => {
        await tx`SELECT pg_temp.test_credit_entry_pass(${uid},${id},0,'crypto')`;
      })).rejects.toMatchObject({ code: "22023" });
      const passes = await sql`SELECT id FROM pg_temp.entry_passes WHERE payment_id=${id}`;
      expect(passes).toHaveLength(0);
      throw rollback;
    }).catch(error => { if (error !== rollback) throw error; return "rolled back"; });
    expect(outcome).toBe("rolled back");
  });

  it("grants exactly 365 days once for a verified receipt; duplicate notifications add nothing", async () => {
    if (!db) throw Error("Database required");
    const outcome = await db.begin(async sql => {
      await setup(sql);
      const uid = crypto.randomUUID();
      const id = `security-test-${crypto.randomUUID()}`;
      await sql`SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true)`;
      const before = await sql`SELECT GREATEST(coalesce(max(expires_at),now()),now()) AS base FROM pg_temp.entry_passes
        WHERE user_id=${uid} AND status='active' AND expires_at>now()`;
      await sql`INSERT INTO pg_temp.entry_pass_payment_receipts(payment_id,user_id,order_id,method,amount_usd,verified_at)
        VALUES (${id},${uid},${id},'crypto',20,now())`;
      const first = await sql`SELECT pg_temp.test_credit_entry_pass(${uid},${id},20,'crypto') AS credited`;
      const again = await sql`SELECT pg_temp.test_credit_entry_pass(${uid},${id},20,'crypto') AS credited`;
      expect(first[0].credited).toBe(true); expect(again[0].credited).toBe(false);
      const rows = await sql`SELECT expires_at FROM pg_temp.entry_passes WHERE payment_id=${id}`;
      expect(rows).toHaveLength(1);
      expect(new Date(rows[0].expires_at).getTime() - new Date(before[0].base).getTime()).toBe(365 * 86400000);
      throw rollback;
    }).catch(error => { if (error !== rollback) throw error; return "rolled back"; });
    expect(outcome).toBe("rolled back");
  });
});