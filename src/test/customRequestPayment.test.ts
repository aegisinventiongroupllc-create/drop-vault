// @vitest-environment node
import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { confirmCustomRequestInvoice, priceAgreedRequest, verifyCustomRequestInvoice } from "../../supabase/functions/_shared/customRequestPayment";

const uid = "11111111-1111-1111-1111-111111111111";
const receipt = { payment_id: "ABC", order_id: "dttreq-1-r", request_id: "r", user_id: uid, base_usd: 100, amount_usd: 105, currency: "USD" };
const paid = { uuid: "INV-ABC", order_id: "dttreq-1-r", fiat_currency: "USD", test_mode: false, status: "paid", amount_in_fiat: 105, amount_paid: 1, amount_to_pay: 1 };

describe("custom request pricing", () => {
  it("prices only accepted requests owned by the payer at agreed base + $5", () => {
    expect(priceAgreedRequest({ id: "r", customer_id: uid, status: "accepted", amount_usd: 100 }, uid)).toEqual({ base_usd: 100, amount_usd: 105 });
    expect(priceAgreedRequest({ id: "r", customer_id: uid, status: "pending", amount_usd: 100 }, uid)).toBeNull();
    expect(priceAgreedRequest({ id: "r", customer_id: "other", status: "accepted", amount_usd: 100 }, uid)).toBeNull();
    expect(priceAgreedRequest({ id: "r", customer_id: uid, status: "accepted", amount_usd: 0 }, uid)).toBeNull();
  });
});

describe("custom request invoice verification", () => {
  it("accepts a fully paid matching invoice", () => expect(verifyCustomRequestInvoice(receipt, paid)).toBe(true));
  it.each([
    ["unpaid", { status: "created" }], ["partial", { amount_paid: 0.5 }], ["wrong amount", { amount_in_fiat: 5 }],
    ["wrong invoice", { uuid: "INV-XYZ" }], ["wrong order", { order_id: "dttreq-2-r" }], ["test mode", { test_mode: true }],
    ["wrong currency", { fiat_currency: "EUR" }],
  ])("rejects %s", (_n, patch) => expect(verifyCustomRequestInvoice(receipt, { ...paid, ...patch })).toBe(false));
  it("rejects a receipt whose total is not base + fees", () => expect(verifyCustomRequestInvoice({ ...receipt, amount_usd: 5 }, { ...paid, amount_in_fiat: 5 })).toBe(false));
  it("never marks paid when verification fails", async () => {
    let marked = false;
    await expect(confirmCustomRequestInvoice(receipt, async () => ({ ...paid, status: "created" }), async () => {}, async () => (marked = true))).rejects.toThrow();
    expect(marked).toBe(false);
  });
});

const db = process.env.SUPABASE_DB_URL ? postgres(process.env.SUPABASE_DB_URL, { max: 1, prepare: false }) : null;
describe.skipIf(!db)("custom request payment database authorization", () => {
  afterAll(async () => { await db?.end(); });
  it.each(["anon", "authenticated"])("denies %s marking paid or writing receipts", async role => {
    const rows = await db!`SELECT has_function_privilege(${role},'public.mark_custom_request_paid(uuid,text)','EXECUTE') AS execute,
      has_table_privilege(${role},'public.custom_request_payment_receipts','INSERT') AS insert,
      has_table_privilege(${role},'public.custom_request_payment_receipts','UPDATE') AS update`;
    expect(rows[0]).toMatchObject({ execute: false, insert: false, update: false });
  });
  it("rejects unpaid, mismatched and unauthorized attempts; marks a verified receipt once", async () => {
    const rollback = new Error("rollback");
    await expect(db!.begin(async sql => {
      for (const t of ["custom_request_payment_receipts", "custom_requests"]) {
        await sql.unsafe(`CREATE TEMP TABLE ${t} (LIKE public.${t} INCLUDING ALL)`);
      }
      const [{ d }] = await sql`SELECT pg_get_functiondef('public.mark_custom_request_paid(uuid,text)'::regprocedure) AS d`;
      const [{ t }] = await sql`SELECT pg_get_functiondef('public.activate_paid_request_delivery()'::regprocedure) AS t`;
      const swap = (s: string) => s.split("public.custom_request_payment_receipts").join("pg_temp.custom_request_payment_receipts")
        .split("public.custom_requests").join("pg_temp.custom_requests")
        .split("auth.role()").join("(current_setting('request.jwt.claims',true)::jsonb->>'role')");
      await sql.unsafe(swap(d).replace("public.mark_custom_request_paid(", "pg_temp.mark_paid("));
      await sql.unsafe(swap(t).replace("public.activate_paid_request_delivery(", "pg_temp.activate("));
      await sql.unsafe(`CREATE TRIGGER a BEFORE UPDATE ON pg_temp.custom_requests FOR EACH ROW EXECUTE FUNCTION pg_temp.activate()`);
      const customer = crypto.randomUUID(); const rid = crypto.randomUUID();
      await sql`INSERT INTO pg_temp.custom_requests(id,customer_id,description,amount_usd,tokens,creator_share_usd,platform_share_usd,status)
        VALUES(${rid},${customer},'x',100,6,90,10,'accepted')`;
      const attempt = (pid: string) => expect(sql.savepoint(tx => tx`SELECT pg_temp.mark_paid(${rid},${pid})`)).rejects.toMatchObject({ code: "42501" });
      // Customer flipping status directly is blocked without a verified receipt.
      await expect(sql.savepoint(tx => tx`UPDATE pg_temp.custom_requests SET status='paid' WHERE id=${rid}`)).rejects.toMatchObject({ code: "42501" });
      await expect(sql.savepoint(tx => tx`UPDATE pg_temp.custom_requests SET status='completed' WHERE id=${rid}`)).rejects.toMatchObject({ code: "42501" });
      await sql`SELECT set_config('request.jwt.claims','{"role":"authenticated"}',true)`;
      await attempt("p1"); // unauthorized
      await sql`SELECT set_config('request.jwt.claims','{"role":"service_role"}',true)`;
      await attempt("p1"); // no receipt
      await sql`INSERT INTO pg_temp.custom_request_payment_receipts(payment_id,order_id,request_id,user_id,base_usd,amount_usd) VALUES('p1','o1',${rid},${customer},100,105)`;
      await attempt("p1"); // unpaid
      await sql`INSERT INTO pg_temp.custom_request_payment_receipts(payment_id,order_id,request_id,user_id,base_usd,amount_usd,verified_at) VALUES('p2','o2',${rid},${crypto.randomUUID()},100,105,now())`;
      await attempt("p2"); // other payer
      await sql`INSERT INTO pg_temp.custom_request_payment_receipts(payment_id,order_id,request_id,user_id,base_usd,amount_usd,verified_at) VALUES('p3','o3',${rid},${customer},20,25,now())`;
      await attempt("p3"); // mismatched price
      await sql`UPDATE pg_temp.custom_request_payment_receipts SET verified_at=now() WHERE payment_id='p1'`;
      const [first] = await sql`SELECT pg_temp.mark_paid(${rid},'p1') AS ok`;
      const [again] = await sql`SELECT pg_temp.mark_paid(${rid},'p1') AS ok`;
      expect(first.ok).toBe(true); expect(again.ok).toBe(false);
      const [row] = await sql`SELECT status, payment_id, fulfillment_deadline FROM pg_temp.custom_requests WHERE id=${rid}`;
      expect(row.status).toBe("paid"); expect(row.payment_id).toBe("p1"); expect(row.fulfillment_deadline).not.toBeNull();
      throw rollback;
    })).rejects.toBe(rollback);
  });
});
