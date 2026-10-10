import { describe, expect, it } from "vitest";
import {
  TOKEN_INVOICE_USD,
  BUNDLE_TOKENS,
  BUNDLE_INVOICE_USD,
  ENTRY_PASS_PRICE_USD,
  ENTRY_PASS_DAYS,
  ADMIN_FEE_USD,
  calculateTokenPurchaseSplit,
} from "@/lib/tokenEconomy";

// Entry pass: the $20/year customer entry fee belongs entirely to the platform vault.
// Creators are never paid from the pass — they earn 90% of Bit-Token unlocks instead.
describe("Vault Entry Pass economy", () => {
  it("charges exactly $20 for the annual pass", () => {
    expect(ENTRY_PASS_PRICE_USD).toBe(20);
  });

  it("grants a full year of access per pass", () => {
    expect(ENTRY_PASS_DAYS).toBe(365);
  });

  it("does not route pass money into Bit-Token creator shares", () => {
    expect(ENTRY_PASS_PRICE_USD).toBeLessThan(TOKEN_INVOICE_USD);
    expect(ENTRY_PASS_PRICE_USD).not.toBe(TOKEN_INVOICE_USD);
  });
});

// Bundle pricing: $1 fee is charged once across the bundle, keeping the 5-token
// pack the best deal (5 × $21 would be $105, not $101).
describe("Bit-Token pricing", () => {
  it("keeps the 1-token price at $21", () => {
    expect(TOKEN_INVOICE_USD).toBe(21);
  });

  it("keeps the 5-token bundle at $101 with one fee", () => {
    expect(BUNDLE_TOKENS).toBe(5);
    expect(BUNDLE_INVOICE_USD).toBe(101);
  });

  it("splits every $20 token base 90/10 with a $1 fee", () => {
    const split = calculateTokenPurchaseSplit(BUNDLE_INVOICE_USD, BUNDLE_TOKENS);
    expect(split.adminFee).toBe(ADMIN_FEE_USD);
    expect(split.creatorShare).toBe(90);
    expect(split.platformShare).toBe(10);
    expect(split.totalPlatformRevenue).toBe(11);
  });
});
