import { describe, expect, it } from "vitest";
import { waitlistEntryForecast } from "@/lib/waitlistForecast";

describe("founding customer annual entry scenarios", () => {
  it("uses the lifetime $10 annual entry rate, not standard $20", () => {
    expect(waitlistEntryForecast(100)).toEqual({ customers: 100, annualPrice: 10, fullParticipationGross: 1000, quarterParticipationGross: 250 });
  });
  it("counts only whole paying accounts in the illustrative quarter scenario", () => {
    expect(waitlistEntryForecast(2).fullParticipationGross).toBe(20);
    expect(waitlistEntryForecast(2).quarterParticipationGross).toBe(0);
  });
  it("does not invent revenue for absent or invalid membership totals", () => {
    expect(waitlistEntryForecast(0).fullParticipationGross).toBe(0);
    expect(waitlistEntryForecast(-1).fullParticipationGross).toBe(0);
    expect(waitlistEntryForecast(NaN).fullParticipationGross).toBe(0);
  });
});