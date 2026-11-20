import { describe, expect, it } from "vitest";
import { LAUNCH_AT, launchCountdown } from "@/lib/launchCountdown";
describe("New York New Year launch", () => {
  it("matches the ball drop at midnight New York, not UTC", () => {
    expect(LAUNCH_AT).toBe(Date.parse("2027-01-01T05:00:00Z"));
    expect(launchCountdown(Date.parse("2027-01-01T00:00:00Z")).hours).toBe(5);
  });
  it("shows the final second then celebrates at zero", () => {
    expect(launchCountdown(LAUNCH_AT - 1000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 1, complete: false });
    expect(launchCountdown(LAUNCH_AT).complete).toBe(true);
  });
  it("never restarts or becomes negative after New Year", () => {
    expect(launchCountdown(LAUNCH_AT + 86400000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, complete: true });
  });
});