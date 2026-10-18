import { describe, expect, it, vi } from "vitest";
import { confirmTokenInvoice, verifyTokenInvoice } from "../../supabase/functions/_shared/tokenPayment";

const receipt = { payment_id: "ABC", order_id: "dtt-order", user_id: "buyer", tokens: 1, amount_usd: 25, currency: "USD" };
const paid = { uuid: "INV-ABC", order_id: "dtt-order", status: "paid", test_mode: false, fiat_currency: "USD", amount_in_fiat: 25, amount_paid: 0.3, amount_to_pay: 0.3 };

describe("crypto token confirmation", () => {
  it.each([1, 5, 100])("accepts %s tokens at exactly $25 per token", tokens => {
    expect(verifyTokenInvoice({ ...receipt, tokens, amount_usd: tokens * 25 }, { ...paid, amount_in_fiat: tokens * 25 })).toBe(true);
  });
  it.each(["created", "partial", "canceled"])("does not credit %s invoices", async status => {
    const mark = vi.fn(); const credit = vi.fn();
    await expect(confirmTokenInvoice(receipt, async () => ({ ...paid, status }), mark, credit)).rejects.toThrow();
    expect(mark).not.toHaveBeenCalled(); expect(credit).not.toHaveBeenCalled();
  });
  it.each([undefined, null, 0, -1, 24, 26, "NaN"])("rejects missing or wrong amount %s", amount_in_fiat => {
    expect(verifyTokenInvoice(receipt, { ...paid, amount_in_fiat })).toBe(false);
  });
  it("rejects another checkout's invoice", () => {
    expect(verifyTokenInvoice(receipt, { ...paid, uuid: "INV-OTHER" })).toBe(false);
    expect(verifyTokenInvoice(receipt, { ...paid, order_id: "other" })).toBe(false);
  });
  it("rejects test mode, wrong currency and underpayment", () => {
    expect(verifyTokenInvoice(receipt, { ...paid, test_mode: true })).toBe(false);
    expect(verifyTokenInvoice(receipt, { ...paid, fiat_currency: "EUR" })).toBe(false);
    expect(verifyTokenInvoice(receipt, { ...paid, amount_paid: 0.1 })).toBe(false);
  });
  it.each([0, 101, 501, 1.5])("rejects unsupported token count %s", tokens => {
    expect(verifyTokenInvoice({ ...receipt, tokens }, paid)).toBe(false);
  });
  it("fails closed on unavailable verification or receipt recording", async () => {
    const credit = vi.fn();
    await expect(confirmTokenInvoice(receipt, async () => { throw Error("offline"); }, vi.fn(), credit)).rejects.toThrow();
    await expect(confirmTokenInvoice(receipt, async () => paid, async () => { throw Error("write failed"); }, credit)).rejects.toThrow();
    expect(credit).not.toHaveBeenCalled();
  });
  it("records evidence before crediting and preserves duplicate result", async () => {
    const calls: string[] = [];
    const result = await confirmTokenInvoice(receipt, async () => paid, async () => { calls.push("verified"); }, async () => { calls.push("credit"); return false; });
    expect(calls).toEqual(["verified", "credit"]); expect(result).toBe(false);
  });
});