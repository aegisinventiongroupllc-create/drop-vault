import { describe, expect, it } from "vitest";
import { checkoutAllocation, vaultPercent, requestPercent, POWER_WEEK_MS, VIP_CAP } from "@/lib/monetization";
import { calculateCustomRequestSplit, calculateTokenPurchaseSplit } from "@/lib/tokenEconomy";
describe("latest monetization rules", () => {
  it("pays standard creators $18 from the $20 base", () => expect(20 * vaultPercent("NONE") / 100).toBe(18));
  it.each(["PRO_PASS", "ELITE_PASS"] as const)("caps %s at $18.40", pass => expect(20 * vaultPercent(pass, 93) / 100).toBe(18.4));
  it("pays $19 during Power Week and reverts to 92% at expiry", () => {
    expect(vaultPercent("NONE", 92, POWER_WEEK_MS, 0)).toBe(95);
    expect(vaultPercent("NONE", 92, POWER_WEEK_MS, POWER_WEEK_MS)).toBe(92);
    expect(POWER_WEEK_MS).toBe(604800000);
  });
  it("splits standard requests 85/15", () => expect(calculateCustomRequestSplit(100, requestPercent("NONE"))).toMatchObject({ creatorShare: 85, platformShare: 15 }));
  it("splits Elite requests 90/10", () => expect(calculateCustomRequestSplit(100, requestPercent("ELITE_PASS"))).toMatchObject({ creatorShare: 90, platformShare: 10 }));
  it("allocates $25 as $1 + $4 + $20", () => expect(checkoutAllocation(1, "crypto")).toMatchObject({ total: 25, dttFee: 1, buffer: 4, base: 20, networkPassthrough: 0 }));
  it.each([1.9, 2.5])("deducts card cost %s only from buffer", fee => expect(checkoutAllocation(1, "card", fee)).toMatchObject({ base: 20, bufferRemaining: 4-fee }));
  it("passes actual crypto network fees through without reducing base", () => expect(checkoutAllocation(1, "crypto", .03)).toMatchObject({ base: 20, networkPassthrough: .03, bufferRemaining: 4 }));
  it("allocates five tokens with $5 DTT fees and $20 buffer", () => expect(calculateTokenPurchaseSplit(125, 5)).toMatchObject({ adminFee: 5, base: 100, processingAllowance: 20 }));
  it("caps VIP inventory at 1000", () => expect(VIP_CAP).toBe(1000));
});