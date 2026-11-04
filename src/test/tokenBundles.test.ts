import { describe, expect, it } from "vitest";
import { tokenInvoiceTotal, calculateTokenPurchaseSplit } from "@/lib/tokenEconomy";
import { validTokenReceiptPrice } from "../../supabase/functions/_shared/tokenPricing";

describe("approved all-inclusive bundles", () => {
  it.each([[1,25], [5,120], [10,230]])("prices %i tokens at $%i", (tokens, total) => {
    expect(tokenInvoiceTotal(tokens)).toBe(total);
  });
  it.each([[6,145], [11,255], [15,350], [26,605], [100,2300]])("combines bundles without deeper discounts: %i for $%i", (tokens, total) => {
    expect(tokenInvoiceTotal(tokens)).toBe(total);
  });
  it.each([0,101,1.5,NaN])("rejects unsupported quantity %s", quantity => {
    expect(() => tokenInvoiceTotal(quantity)).toThrow();
  });
  it("keeps ten tokens worth $200 and standard creator allocation $180", () => {
    expect(calculateTokenPurchaseSplit(230,10)).toMatchObject({ base:200, creatorShare:180, platformShare:20 });
  });
  it("rejects arbitrary or underpaid prices", () => {
    expect(validTokenReceiptPrice(10,210)).toBe(false);
    expect(validTokenReceiptPrice(5,119.99)).toBe(false);
  });
});