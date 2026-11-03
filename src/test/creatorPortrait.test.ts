import { describe, expect, it } from "vitest";
import { validatePortraitDuration, isVideoPortrait } from "@/lib/creatorPortrait";

describe("optional five-second creator portraits", () => {
  it("accepts a five-second smile", () => { expect(() => validatePortraitDuration(5)).not.toThrow(); });
  it("rejects videos longer than five seconds", () => { expect(() => validatePortraitDuration(5.01)).toThrow(); });
  it("rejects unknown duration", () => { expect(() => validatePortraitDuration(Infinity)).toThrow(); });
  it("keeps still photos distinct from video portraits", () => {
    expect(isVideoPortrait("creator/profile.jpg")).toBe(false);
    expect(isVideoPortrait("creator/profile.mp4")).toBe(true);
  });
});