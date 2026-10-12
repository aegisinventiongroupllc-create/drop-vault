import { describe, it, expect, vi, afterEach } from "vitest";
import { POWER_WEEK_SPLIT, DEFAULT_SPLIT, INCENTIVE_DURATION_MS, getCreatorSplitState } from "@/lib/paymentSplit";

afterEach(() => vi.useRealTimers());

describe("Power Week split", () => {
  it("pays creators 95% and the platform 5%", () => {
    expect(POWER_WEEK_SPLIT).toEqual({ creator: 95, platform: 5 });
  });
  it("lasts exactly 7 days", () => {
    expect(INCENTIVE_DURATION_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
  it("goes back to 90/10 after the 7 days end", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const started = getCreatorSplitState("c1", 100_000);
    expect(started.currentSplit).toEqual({ creator: 95, platform: 5 });
    vi.setSystemTime(new Date("2026-01-08T00:00:01Z"));
    const after = getCreatorSplitState("c1", 100_000, started);
    expect(after.currentSplit).toEqual(DEFAULT_SPLIT);
    expect(DEFAULT_SPLIT).toEqual({ creator: 90, platform: 10 });
  });
});
