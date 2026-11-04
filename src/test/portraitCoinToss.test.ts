import { describe, it, expect } from "vitest";
import { coinTossCount } from "@/lib/portraitCoinToss";
describe("portrait token quantities", () => {
  it("tosses one coin for the one-token unlock", () => expect(coinTossCount(1)).toBe(1));
  it("tosses exactly 25 coins for 25 tokens", () => expect(coinTossCount(25)).toBe(25));
  it("preserves other whole token quantities", () => expect(coinTossCount(26)).toBe(26));
  it("rejects fractional or invalid quantities", () => { expect(coinTossCount(1.5)).toBe(0); expect(coinTossCount(-1)).toBe(0); });
});