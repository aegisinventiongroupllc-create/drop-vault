import { expect, it } from "vitest";
import { shouldCelebrateWaitlistJoin } from "@/lib/waitlistCelebration";
it("celebrates a successful first waiting-list join", () => { expect(shouldCelebrateWaitlistJoin(false, true)).toBe(true); });
it("does not celebrate an existing member's country update or reload", () => { expect(shouldCelebrateWaitlistJoin(true, true)).toBe(false); });
it("does not celebrate a failed join", () => { expect(shouldCelebrateWaitlistJoin(false, false)).toBe(false); });