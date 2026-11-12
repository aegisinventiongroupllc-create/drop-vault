// @vitest-environment node
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false, connect_timeout: 30 }) : null;
const tables = ["vip_pass_checkouts", "vip_pass_payment_receipts", "vip_pass_inventory", "creator_split_settings", "account_bans", "creator_consent_withdrawals"];
async function fixture(sql: postgres.TransactionSql) {
  for (const table of tables) await sql.unsafe(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL) ON COMMIT DROP`);
  await sql.unsafe("CREATE OR REPLACE FUNCTION pg_temp.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS 'SELECT true'");
  for (const fn of ["reserve_vip_checkout(uuid,public.vip_pass_type)", "claim_vip_invoice(uuid)", "attach_vip_invoice(uuid,text,text)", "release_vip_checkout(uuid)", "apply_verified_vip_pass(text)"]) {
    const [row] = await sql`SELECT pg_get_functiondef(${`public.${fn}`}::regprocedure) AS d`;
    let body = row.d.replace(`public.${fn.split("(")[0]}(`, `pg_temp.${fn.split("(")[0]}(`).replaceAll("auth.role()", "'service_role'").replaceAll("public.has_role", "pg_temp.has_role");
    for (const table of tables) body = body.replaceAll(`public.${table}`, `pg_temp.${table}`);
    await sql.unsafe(body);
  }
  await sql`INSERT INTO pg_temp.vip_pass_inventory(id,total_passes_cap,passes_sold) VALUES(true,1000,999)`;
}
describe.skipIf(!db)("VIP isolated checkout database", () => {
  afterAll(async () => { await db?.end(); });
  it("first reservation owns the last slot; the other type cannot take it", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      await fixture(sql);
      const creator = crypto.randomUUID();
      const [first] = await sql`SELECT (pg_temp.reserve_vip_checkout(${creator},'PRO_PASS')).*`;
      const [retry] = await sql`SELECT (pg_temp.reserve_vip_checkout(${creator},'PRO_PASS')).*`;
      expect(first.id).toBe(retry.id); expect(Number(first.amount_usd)).toBe(1500);
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.reserve_vip_checkout(${crypto.randomUUID()},'ELITE_PASS')`)).rejects.toThrow("sold out");
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.reserve_vip_checkout(${creator},'ELITE_PASS')`)).rejects.toThrow("existing VIP checkout");
    });
  });
  it.each([['PRO_PASS', 1500, false], ['ELITE_PASS', 3500, true]] as const)("claims exactly one %s invoice and grants once after verification", async (pass, price, badge) => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      await fixture(sql);
      const creator = crypto.randomUUID();
      const [c] = await sql`SELECT (pg_temp.reserve_vip_checkout(${creator},${pass})).*`;
      expect(Number(c.amount_usd)).toBe(price);
      const [claim] = await sql`SELECT pg_temp.claim_vip_invoice(${c.id}) AS ok`; expect(claim.ok).toBe(true);
      const [retry] = await sql`SELECT pg_temp.claim_vip_invoice(${c.id}) AS ok`; expect(retry.ok).toBe(false);
      await sql`SELECT pg_temp.attach_vip_invoice(${c.id},'payment','https://pay.example/checkout')`;
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.apply_verified_vip_pass('payment')`)).rejects.toThrow("Verified eligible creator payment");
      await sql`UPDATE pg_temp.vip_pass_payment_receipts SET verified_at=now() WHERE payment_id='payment'`;
      const [granted] = await sql`SELECT pg_temp.apply_verified_vip_pass('payment') AS ok`; expect(granted.ok).toBe(true);
      const [again] = await sql`SELECT pg_temp.apply_verified_vip_pass('payment') AS ok`; expect(again.ok).toBe(false);
      const [stock] = await sql`SELECT passes_sold FROM pg_temp.vip_pass_inventory`; expect(stock.passes_sold).toBe(1000);
      const [checkout] = await sql`SELECT status FROM pg_temp.vip_pass_checkouts WHERE id=${c.id}`; expect(checkout.status).toBe("completed");
      const [settings] = await sql`SELECT vip_pass_purchased,vip_badge FROM pg_temp.creator_split_settings WHERE creator_id=${creator}`; expect(settings.vip_pass_purchased).toBe(pass); expect(settings.vip_badge).toBe(badge);
    });
  });
  it("never times out an invoice whose creation may have reached the provider", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      await fixture(sql);
      const [c] = await sql`SELECT (pg_temp.reserve_vip_checkout(${crypto.randomUUID()},'PRO_PASS')).*`;
      await sql`SELECT pg_temp.claim_vip_invoice(${c.id})`;
      await sql`UPDATE pg_temp.vip_pass_checkouts SET expires_at=now()-interval '1 hour' WHERE id=${c.id}`;
      await expect(sql.savepoint(tx => tx`SELECT pg_temp.reserve_vip_checkout(${crypto.randomUUID()},'ELITE_PASS')`)).rejects.toThrow("sold out");
      await sql`SELECT pg_temp.release_vip_checkout(${c.id})`;
      const [next] = await sql`SELECT (pg_temp.reserve_vip_checkout(${crypto.randomUUID()},'ELITE_PASS')).*`; expect(next.pass_type).toBe("ELITE_PASS");
    });
  });
  it("expires unclaimed reservations without freeing invoiced slots", async () => {
    if (!db) throw Error("Database required");
    await db.begin(async sql => {
      await fixture(sql);
      const [c] = await sql`SELECT (pg_temp.reserve_vip_checkout(${crypto.randomUUID()},'PRO_PASS')).*`;
      await sql`UPDATE pg_temp.vip_pass_checkouts SET expires_at=now()-interval '1 hour' WHERE id=${c.id}`;
      const [next] = await sql`SELECT (pg_temp.reserve_vip_checkout(${crypto.randomUUID()},'ELITE_PASS')).*`; expect(next.pass_type).toBe("ELITE_PASS");
    });
  });
  it("keeps invoice and grant writes service-only", async () => {
    if (!db) throw Error("Database required");
    for (const role of ["anon", "authenticated"]) for (const fn of ["claim_vip_invoice(uuid)", "attach_vip_invoice(uuid,text,text)", "release_vip_checkout(uuid)", "reserve_vip_checkout(uuid,public.vip_pass_type)", "apply_verified_vip_pass(text)"]) {
      const [r] = await db`SELECT has_function_privilege(${role},${`public.${fn}`},'EXECUTE') AS ok`; expect(r.ok).toBe(false);
    }
  });
});