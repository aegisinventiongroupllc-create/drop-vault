import { describe, it, expect } from "vitest";
import { calculateTipSplit, calculateTokenTip, calculateSupportTipSplit, tokenInvoiceTotal } from "@/lib/tokenEconomy";

describe("tips transfer the full spending value without a DTT fee", () => {
  it("a $20 tip gives the creator $20 and the platform $0, no added fee", () => {
    expect(calculateTipSplit(20)).toMatchObject({ adminFee: 0, creatorShare: 20, platformShare: 0 });
  });
  it.each([[1, 20], [2, 40], [3, 60]])("%i tokens have $%i tip value", (tokens, tipAmount) => {
    expect(calculateTokenTip(tokens)).toMatchObject({ tokens, tipAmount, adminFee: 0, creatorShare: tipAmount, platformShare: 0 });
  });
  it("also transfers the full $20 value for dashboard support tips", () => {
    expect(calculateSupportTipSplit()).toEqual({ tokens: 1, totalUsd: 20, creatorShare: 20, platformShare: 0 });
  });
  it("rejects fractional or empty token tips", () => {
    expect(() => calculateTokenTip(0.5)).toThrow();
    expect(() => calculateTokenTip(0)).toThrow();
  });
  it.each([[1, 25], [2, 50], [40, 920]])("%i purchased tokens cost $%i including fees", (tokens, total) => {
    expect(tokenInvoiceTotal(tokens)).toBe(total);
  });
});
