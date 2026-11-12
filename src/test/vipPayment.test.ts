// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { VIP_PRICES, vipPrice, vipRemaining, verifyVipInvoice, confirmVipInvoice, vipInvoiceCanRelease } from "../../supabase/functions/_shared/vipPayment";
const receipt = { payment_id: "payment", order_id: "dttvip-checkout", creator_id: "creator", pass_type: "PRO_PASS", amount_usd: 1500, currency: "USD" };
const invoice = { uuid: "INV-payment", order_id: "dttvip-checkout", fiat_currency: "USD", amount_in_fiat: 1500, test_mode: false, status: "paid", amount_paid: 10, amount_to_pay: 10 };
describe("VIP verified payments", () => {
  it("prices Pro at $1,500", () => expect(vipPrice("PRO_PASS")).toBe(1500));
  it("prices Elite at $3,500", () => expect(VIP_PRICES.ELITE_PASS).toBe(3500));
  it("rejects unknown products", () => expect(vipPrice("FREE_PASS")).toBeNull());
  it("shares a maximum 1,000 passes", () => expect(vipRemaining(5000, 999)).toBe(1));
  it("reserves the final pass across both types", () => expect(vipRemaining(1000, 999, 1)).toBe(0));
  it("sold-out stays zero", () => expect(vipRemaining(1000, 1001)).toBe(0));
  it("validates a fully paid Pro invoice", () => expect(verifyVipInvoice(receipt, invoice)).toBe(true));
  it("validates a fully paid Elite invoice", () => expect(verifyVipInvoice({ ...receipt, pass_type: "ELITE_PASS", amount_usd: 3500 }, { ...invoice, amount_in_fiat: 3500 })).toBe(true));
  it.each([{ status: "created" }, { amount_paid: 9 }, { test_mode: true }, { order_id: "other" }, { uuid: "other" }, { fiat_currency: "EUR" }, { amount_in_fiat: 25 }, { amount_to_pay: 0 }])("rejects unverified merchant invoice %j", patch => expect(verifyVipInvoice(receipt, { ...invoice, ...patch })).toBe(false));
  it("does not grant or mark an unpaid invoice", async () => {
    const mark = vi.fn(), grant = vi.fn();
    await expect(confirmVipInvoice(receipt, async () => ({ ...invoice, status: "created" }), mark, grant)).rejects.toThrow("not verified");
    expect(mark).not.toHaveBeenCalled(); expect(grant).not.toHaveBeenCalled();
  });
  it("marks before granting and propagates idempotent false", async () => {
    const calls: string[] = [];
    expect(await confirmVipInvoice(receipt, async () => invoice, async () => { calls.push("verified"); }, async () => { calls.push("grant"); return false; })).toBe(false);
    expect(calls).toEqual(["verified", "grant"]);
  });
  it("releases only confirmed unpaid terminal invoices", () => expect(vipInvoiceCanRelease(receipt, { ...invoice, status: "expired", amount_paid: 0 })).toBe(true));
  it.each([{ status: "created", amount_paid: 0 }, { status: "expired", amount_paid: 1 }, { status: "expired", amount_paid: 0, test_mode: true }, { status: "expired", amount_paid: 0, order_id: "other" }])("keeps unsafe invoice held %j", patch => expect(vipInvoiceCanRelease(receipt, { ...invoice, ...patch })).toBe(false));
});