import { describe, it, expect } from "vitest";
import { calculateTipSplit } from "@/lib/tokenEconomy";

describe("tips have no customer fee", () => {
  it("a $20 tip gives the creator $18 and the platform $2, no added fee", () => {
    expect(calculateTipSplit(20)).toMatchObject({ adminFee: 0, creatorShare: 18, platformShare: 2 });
  });
});
