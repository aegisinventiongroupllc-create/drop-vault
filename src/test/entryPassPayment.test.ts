import { describe, expect, it, vi } from "vitest";
import { confirmEntryPassInvoice, verifyEntryPassInvoice } from "../../supabase/functions/_shared/entryPassPayment";

const receipt = { payment_id: "ABC123", order_id: "dttpass-order", user_id: "buyer", amount_usd: 20, currency: "USD", method: "crypto" };
const paid = { uuid: "INV-ABC123", order_id: receipt.order_id, amount_in_fiat: 20, fiat_currency: "USD", status: "paid", test_mode: false, amount_paid: 0.2, amount_to_pay: 0.2 };

describe("entry-pass authoritative payment verification", () => {
  it("accepts a matching live fully paid $20 USD invoice", () => {
    expect(verifyEntryPassInvoice(receipt, paid)).toBe(true);
  });
  it.each(["created", "partial", "canceled"])("never credits a %s invoice", async status => {
    const mark = vi.fn(); const credit = vi.fn();
    await expect(confirmEntryPassInvoice(receipt, async () => ({ ...paid, status }), mark, credit)).rejects.toThrow();
    expect(mark).not.toHaveBeenCalled(); expect(credit).not.toHaveBeenCalled();
  });
  it.each([undefined, null, 0, -1, "NaN", 19, 21])("rejects invalid or incorrect fiat amount %s", amount_in_fiat => {
    expect(verifyEntryPassInvoice(receipt, { ...paid, amount_in_fiat })).toBe(false);
  });
  it("rejects an invoice belonging to another checkout", () => {
    expect(verifyEntryPassInvoice(receipt, { ...paid, order_id: "other-order" })).toBe(false);
    expect(verifyEntryPassInvoice(receipt, { ...paid, uuid: "INV-OTHER" })).toBe(false);
  });
  it("rejects test payments and non-USD invoices", () => {
    expect(verifyEntryPassInvoice(receipt, { ...paid, test_mode: true })).toBe(false);
    expect(verifyEntryPassInvoice(receipt, { ...paid, fiat_currency: "EUR" })).toBe(false);
  });
  it("rejects insufficient or missing cryptocurrency payment", () => {
    expect(verifyEntryPassInvoice(receipt, { ...paid, amount_paid: 0.1 })).toBe(false);
    expect(verifyEntryPassInvoice(receipt, { ...paid, amount_paid: undefined })).toBe(false);
    expect(verifyEntryPassInvoice(receipt, { ...paid, amount_to_pay: 0 })).toBe(false);
  });
  it("fails closed when provider lookup or receipt recording fails", async () => {
    const credit = vi.fn();
    await expect(confirmEntryPassInvoice(receipt, async () => { throw Error("offline"); }, vi.fn(), credit)).rejects.toThrow();
    await expect(confirmEntryPassInvoice(receipt, async () => paid, async () => { throw Error("denied"); }, credit)).rejects.toThrow();
    expect(credit).not.toHaveBeenCalled();
  });
  it("records verified evidence before granting access", async () => {
    const calls: string[] = [];
    await confirmEntryPassInvoice(receipt, async () => paid, async () => { calls.push("verified"); }, async () => { calls.push("credit"); });
    expect(calls).toEqual(["verified", "credit"]);
  });
});