import { describe, it, expect } from "vitest";
import { calculateTipSplit, calculateTokenTip, tokenInvoiceTotal } from "@/lib/tokenEconomy";

describe("tips have no customer fee", () => {
  it("a $20 tip gives the creator $18 and the platform $2, no added fee", () => {
    expect(calculateTipSplit(20)).toMatchObject({ adminFee: 0, creatorShare: 18, platformShare: 2 });
  });
  it.each([[1, 20], [2, 40], [3, 60]])("%i tokens have $%i tip value", (tokens, tipAmount) => {
    expect(calculateTokenTip(tokens)).toMatchObject({ tokens, tipAmount, adminFee: 0 });
  });
  it("rejects fractional or empty token tips", () => {
    expect(() => calculateTokenTip(0.5)).toThrow();
    expect(() => calculateTokenTip(0)).toThrow();
  });
  it.each([[1, 25], [2, 50], [40, 920]])("%i purchased tokens cost $%i including fees", (tokens, total) => {
    expect(tokenInvoiceTotal(tokens)).toBe(total);
  });
});
