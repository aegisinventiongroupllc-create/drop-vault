import { describe, expect, it } from "vitest";
import {
  TOKEN_INVOICE_USD,
  BUNDLE_TOKENS,
  BUNDLE_INVOICE_USD,
  ENTRY_PASS_PRICE_USD,
  ENTRY_PASS_DAYS,
  ADMIN_FEE_USD,
  TRANSACTION_FEE_USD,
  tokenInvoiceTotal,
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

// Bundle pricing: 5 × $25 = $125, with the $1 fee charged once and a $4/token
// card-processing allowance built in.
describe("Bit-Token pricing", () => {
  it("charges $25 for a single Bit-Token", () => {
    expect(TOKEN_INVOICE_USD).toBe(25);
  });

  it("keeps creators at $18 and platform at $3 on a $25 token, with $4 for card fees", () => {
    const split = calculateTokenPurchaseSplit(TOKEN_INVOICE_USD, 1);
    expect(split.creatorShare).toBe(18);
    expect(split.totalPlatformRevenue).toBe(3);
    expect(split.processingAllowance).toBe(4);
  });

  it("prices the 5-token bundle at $125 with one fee", () => {
    expect(BUNDLE_TOKENS).toBe(5);
    expect(BUNDLE_INVOICE_USD).toBe(125);
  });

  it("builds a $24 card-fee allowance into the bundle", () => {
    const split = calculateTokenPurchaseSplit(BUNDLE_INVOICE_USD, BUNDLE_TOKENS);
    expect(split.processingAllowance).toBe(24);
  });

  it("splits every $20 token base 90/10 with a $1 fee", () => {
    const split = calculateTokenPurchaseSplit(BUNDLE_INVOICE_USD, BUNDLE_TOKENS);
    expect(split.adminFee).toBe(ADMIN_FEE_USD);
    expect(split.creatorShare).toBe(90);
    expect(split.platformShare).toBe(10);
    expect(split.totalPlatformRevenue).toBe(11);
  });
});

// Every token purchase adds a flat $1 transaction fee on top of the token total.
// The fee is platform revenue and is charged once per purchase, not per token.
describe("Transaction fee", () => {
  it("is exactly $1 per purchase", () => {
    expect(TRANSACTION_FEE_USD).toBe(1);
  });

  it("adds $1 to a single token: $25 + $1 = $26", () => {
    expect(tokenInvoiceTotal(1)).toBe(26);
  });

  it("adds $1 to the bundle: $125 + $1 = $126", () => {
    expect(tokenInvoiceTotal(5)).toBe(126);
  });

  it("adds $1 to any quantity: 40 tokens = $1,000 + $1 = $1,001", () => {
    expect(tokenInvoiceTotal(40)).toBe(1001);
  });
});
