import { describe, it, expect } from "vitest";
import { teaserGateTime, isTeaserTooLong, MAX_TEASER_SECONDS } from "@/lib/teaserGate";

describe("teaser gate", () => {
  it("allows teasers up to one minute", () => {
    expect(MAX_TEASER_SECONDS).toBe(60);
    expect(isTeaserTooLong(60)).toBe(false);
    expect(isTeaserTooLong(75)).toBe(true);
  });
  it("stops a one-minute teaser at 30 seconds", () => {
    expect(teaserGateTime(60)).toBe(30);
  });
});
