import { describe, expect, it } from "vitest";
import { nextVipBatch } from "@/components/LifetimeUpgradeStore";
describe("VIP batch on May 1 midnight New York", () => {
  it("before May 1 picks this year", () => expect(nextVipBatch(new Date("2027-03-01T00:00:00Z")).toISOString()).toBe("2027-05-01T04:00:00.000Z"));
  it("after May 1 picks next year", () => expect(nextVipBatch(new Date("2026-11-03T00:00:00Z")).toISOString()).toBe("2027-05-01T04:00:00.000Z"));
});
