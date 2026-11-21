import { describe, expect, it } from "vitest";
import { CREATOR_EARNINGS } from "@/lib/creatorEarningsDisclosure";
import { calculateCustomRequestSplit } from "@/lib/tokenEconomy";
import { POWER_WEEK_SPLIT, INCENTIVE_DURATION_MS } from "@/lib/paymentSplit";

describe("current creator earnings disclosure values", () => {
  it("uses 90/10 base", () => expect(CREATOR_EARNINGS.base).toBe(90));
  it("uses 91/9 founding", () => expect(CREATOR_EARNINGS.founding).toBe(91));
  it("uses Pro 92/8", () => expect(CREATOR_EARNINGS.pro).toBe(92));
  it("uses Elite 93/7", () => expect(CREATOR_EARNINGS.elite).toBe(93));
  it("uses 92/8 for a seven-day Power Week", () => {
    expect(CREATOR_EARNINGS.powerWeek).toBe(92);
    expect(POWER_WEEK_SPLIT).toEqual({ creator: 92, platform: 8 });
    expect(INCENTIVE_DURATION_MS).toBe(CREATOR_EARNINGS.powerWeekDays * 86_400_000);
  });
  it("uses 95/5 for the annual award", () => expect(CREATOR_EARNINGS.annualAward).toBe(95));
  it("uses 85/15 on ordinary custom requests", () => {
    expect(calculateCustomRequestSplit(100, CREATOR_EARNINGS.request)).toMatchObject({ creatorShare: 85, platformShare: 15 });
  });
  it("uses 90/10 only for Elite custom requests", () => {
    expect(calculateCustomRequestSplit(100, CREATOR_EARNINGS.eliteRequest)).toMatchObject({ creatorShare: 90, platformShare: 10 });
  });
});