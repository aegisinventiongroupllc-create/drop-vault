import { describe, expect, it } from "vitest";
import { customerPrelaunch } from "@/lib/customerLaunch";
import { CUSTOMER_LAUNCH_AT, customerCheckoutOpen, entryPriceFor } from "../../supabase/functions/_shared/customerLaunch";
import { verifyEntryPassInvoice } from "../../supabase/functions/_shared/entryPassPayment";
describe("customer waiting-list launch rules", () => {
  it("blocks customer checkout until January 1 New York midnight", () => {
    expect(customerCheckoutOpen(Date.parse("2027-01-01T04:59:59Z"))).toBe(false);
    expect(customerPrelaunch(CUSTOMER_LAUNCH_AT - 1)).toBe(true);
    expect(customerCheckoutOpen(CUSTOMER_LAUNCH_AT)).toBe(true);
    expect(customerPrelaunch(CUSTOMER_LAUNCH_AT)).toBe(false);
  });
  it("uses the server-authorized $10 waiting-list or $20 standard annual price", async () => {
    for (const amount of [10,20]) expect(await entryPriceFor({ rpc: async () => ({ data: amount, error: null }) }, "customer")).toBe(amount);
    await expect(entryPriceFor({ rpc: async () => ({ data: 1, error: null }) }, "customer")).rejects.toThrow();
    await expect(entryPriceFor({ rpc: async () => ({ data: 10, error: "denied" }) }, "customer")).rejects.toThrow();
  });
  it("requires an exact verified $10 invoice for a discounted receipt", () => {
    const receipt = { payment_id: "a", order_id: "b", user_id: "c", amount_usd: 10, method: "crypto", currency: "USD" };
    const invoice = { uuid: "a", order_id: "b", amount_in_fiat: 10, fiat_currency: "USD", test_mode: false, status: "paid", amount_paid: 1, amount_to_pay: 1 };
    expect(verifyEntryPassInvoice(receipt, invoice)).toBe(true);
    expect(verifyEntryPassInvoice(receipt, { ...invoice, amount_in_fiat: 20 })).toBe(false);
    expect(verifyEntryPassInvoice({ ...receipt, amount_usd: 20 }, invoice)).toBe(false);
  });
});