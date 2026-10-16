import { describe, expect, it } from "vitest";
import { revenueMonthBounds, recordedSplit } from "../lib/monthlyRevenue";

describe("monthly revenue history", () => {
  it("keeps December within its original year using an exclusive next-month boundary", () => {
    expect(revenueMonthBounds("2026-12")).toEqual({ start: "2026-12-01T00:00:00.000Z", end: "2027-01-01T00:00:00.000Z" });
  });
  it("preserves historical Power Week and founding creator rates", () => {
    expect(recordedSplit({ creator_share_percent: 95 })).toBe(95);
    expect(recordedSplit({ creator_share_percent: 92 })).toBe(92);
    expect(recordedSplit({ creator_share_percent: 90 })).toBe(90);
  });
  it("rejects invalid monthly boundaries", () => {
    expect(() => revenueMonthBounds("2026-13")).toThrow();
  });
});