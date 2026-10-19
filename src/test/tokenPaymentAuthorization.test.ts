// @vitest-environment node
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";

const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false }) : null;
describe.skipIf(!db)("token payment database authorization", () => {
  // Test the deployed body against isolated temporary tables; sandbox cannot
  // assume service_role or call auth.role(). Live privileges checked separately.
  afterAll(async () => { await db?.end(); });
  it.each(["anon", "authenticated"])("denies %s execution and receipt writes", async role => {
    if (!db) throw Error("Database required");
    const rows = await db`SELECT has_function_privilege(${role},'public.credit_tokens(uuid,text,integer,numeric)','EXECUTE') AS execute,
      has_table_privilege(${role},'public.token_payment_receipts','INSERT') AS insert,
      has_table_privilege(${role},'public.token_payment_receipts','UPDATE') AS update`;
    expect(rows[0]).toMatchObject({ execute: false, insert: false, update: false });
  });
  it("rejects unpaid, mismatched and invalid attempts; credits a verified receipt once", async () => {
    if (!db) throw Error("Database required");
    const rollback = new Error("rollback isolated test");
    const result = await db.begin(async sql => {
    for (const table of ["token_payment_receipts", "token_purchases", "token_balances"]) {
      await sql.unsafe(`DROP TABLE IF EXISTS pg_temp.${table}`);
      await sql.unsafe(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL)`);
    }
    const rows = await sql`SELECT pg_get_functiondef('public.credit_tokens(uuid,text,integer,numeric)'::regprocedure) AS definition`;
    let definition = rows[0].definition.replace("public.credit_tokens(", "pg_temp.test_credit_tokens(");
    for (const table of ["token_payment_receipts", "token_purchases", "token_balances"]) definition = definition.replaceAll(`public.${table}`, `pg_temp.${table}`);
    definition = definition.replaceAll("auth.role()", "(current_setting('request.jwt.claims',true)::jsonb->>'role')");
    await sql.unsafe(definition);
      await sql`SELECT set_config('request.jwt.claims','{"role":"authenticated"}',true)`;
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.test_credit_tokens(gen_random_uuid(),'unauthorized',1,25)`)).rejects.toMatchObject({ code: "42501" });
      const uid = crypto.randomUUID(); const id = crypto.randomUUID();
      await sql`SELECT set_config('request.jwt.claims','{"role":"service_role"}',true)`;
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.test_credit_tokens(${uid},${id},1,25)`)).rejects.toMatchObject({ code: "42501" });
      await sql`INSERT INTO pg_temp.token_payment_receipts(payment_id,order_id,user_id,tokens,amount_usd) VALUES(${id},${id},${uid},1,25)`;
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.test_credit_tokens(${uid},${id},1,25)`)).rejects.toMatchObject({ code: "42501" });
      await sql`UPDATE pg_temp.token_payment_receipts SET verified_at=now() WHERE payment_id=${id}`;
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.test_credit_tokens(gen_random_uuid(),${id},1,25)`)).rejects.toMatchObject({ code: "42501" });
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.test_credit_tokens(${uid},${id},5,125)`)).rejects.toMatchObject({ code: "42501" });
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.test_credit_tokens(${uid},${id},1,0)`)).rejects.toMatchObject({ code: "22023" });
      const empty = await sql`SELECT balance FROM pg_temp.token_balances WHERE user_id=${uid}`;
      expect(empty).toHaveLength(0);
      const first = await sql`SELECT pg_temp.test_credit_tokens(${uid},${id},1,25) AS credited`;
      const again = await sql`SELECT pg_temp.test_credit_tokens(${uid},${id},1,25) AS credited`;
      expect(first[0].credited).toBe(true); expect(again[0].credited).toBe(false);
      const balances = await sql`SELECT balance FROM pg_temp.token_balances WHERE user_id=${uid}`;
      expect(balances[0].balance).toBe(1);
      const purchases = await sql`SELECT tokens_credited,amount_usd FROM pg_temp.token_purchases WHERE payment_id=${id}`;
      expect(purchases).toHaveLength(1); expect(purchases[0].tokens_credited).toBe(1); expect(Number(purchases[0].amount_usd)).toBe(25);
      throw rollback;
    }).catch(error => { if (error !== rollback) throw error; return "rolled back"; });
    expect(result).toBe("rolled back");
  });
});