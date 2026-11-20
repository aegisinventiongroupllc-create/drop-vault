// @vitest-environment node
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { CLEAN_TEMP_SCHEMA_SQL } from "./tempSchemaCleanup";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
async function fixture(sql: postgres.TransactionSql) {
  await sql.unsafe(CLEAN_TEMP_SCHEMA_SQL);
  await sql.unsafe("CREATE TEMP TABLE customer_launch_waitlist (LIKE public.customer_launch_waitlist INCLUDING ALL) ON COMMIT DROP; CREATE TEMP TABLE entry_passes (LIKE public.entry_passes INCLUDING ALL) ON COMMIT DROP;");
  await sql.unsafe("CREATE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS 'SELECT current_setting(''test.role'') = $2::text'");
  for (const fn of ["public.my_customer_launch_waitlist(text,text,text)", "public.customer_entry_price(uuid)", "public.admin_customer_launch_waitlist(text,integer)"]) {
    const [row] = await sql`SELECT pg_get_functiondef(${fn}::regprocedure) AS d`;
    await sql.unsafe(row.d.replaceAll("public.my_customer_launch_waitlist", "pg_temp.my_customer_launch_waitlist").replaceAll("public.admin_customer_launch_waitlist", "pg_temp.admin_customer_launch_waitlist").replaceAll("public.customer_entry_price", "pg_temp.customer_entry_price").replaceAll("public.customer_launch_waitlist", "pg_temp.customer_launch_waitlist").replaceAll("public.entry_passes", "pg_temp.entry_passes").replaceAll("public.has_role", "pg_temp.has_role").replaceAll("auth.uid()", "current_setting('test.user')::uuid"));
  }
  await sql`SELECT set_config('test.user',${crypto.randomUUID()},true),set_config('test.role','customer',true)`;
}
describe.skipIf(!db)("customer waiting-list database", () => {
  afterAll(async () => { await db?.end(); });
  it("saves one country per customer without changing the original joining date", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      await fixture(sql);
      const [first] = await sql`SELECT pg_temp.my_customer_launch_waitlist('join','US','en') AS r`;
      const [again] = await sql`SELECT pg_temp.my_customer_launch_waitlist('join','CA','fr') AS r`;
      const [status] = await sql`SELECT pg_temp.my_customer_launch_waitlist('status') AS r`;
      expect(status.r.country).toBe("CA"); expect(status.r.language).toBe("fr"); expect(again.r.joined_at).toBe(first.r.joined_at);
      const [count] = await sql`SELECT count(*)::int AS n FROM pg_temp.customer_launch_waitlist`; expect(count.n).toBe(1);
    });
  });
  it("charges $10 annually for life to pre-launch members and $20 to nonmembers", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      await fixture(sql);
      const [standard] = await sql`SELECT pg_temp.customer_entry_price(current_setting('test.user')::uuid) AS price`; expect(Number(standard.price)).toBe(20);
      await sql`SELECT pg_temp.my_customer_launch_waitlist('join','US','en')`;
      const [discount] = await sql`SELECT pg_temp.customer_entry_price(current_setting('test.user')::uuid) AS price`; expect(Number(discount.price)).toBe(10);
      await sql`INSERT INTO pg_temp.entry_passes(user_id,payment_id,amount_usd,method,expires_at) VALUES(current_setting('test.user')::uuid,'test-paid',10,'crypto',now()+interval '365 days')`;
      const [renewal] = await sql`SELECT pg_temp.customer_entry_price(current_setting('test.user')::uuid) AS price`; expect(Number(renewal.price)).toBe(10);
    });
  });
  it("denies creator joining and non-admin reading and rejects unsupported countries", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      await fixture(sql);
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.admin_customer_launch_waitlist()`)).rejects.toThrow("Administrator account required");
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.my_customer_launch_waitlist('join','JP','en')`)).rejects.toThrow();
      await sql`SELECT set_config('test.role','creator',true)`;
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.my_customer_launch_waitlist('join','US','en')`)).rejects.toThrow("Customer account required");
      await sql`SELECT set_config('test.role','admin',true)`;
      const [r] = await sql`SELECT pg_temp.admin_customer_launch_waitlist() AS r`; expect(r.r.total).toBe(0);
    });
    const [r] = await db`SELECT has_table_privilege('anon','public.customer_launch_waitlist','SELECT') AS public_read,has_table_privilege('authenticated','public.customer_launch_waitlist','INSERT') AS write,has_function_privilege('anon','public.admin_customer_launch_waitlist(text,integer)','EXECUTE') AS public_admin`;
    expect(r.public_read).toBe(false); expect(r.write).toBe(false); expect(r.public_admin).toBe(false);
  });
});