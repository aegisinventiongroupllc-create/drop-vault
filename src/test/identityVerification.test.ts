import { describe, expect, it } from "vitest";
import { identityAge, validIdentityImage } from "@/lib/identityVerification";
describe("manual identity validation", () => {
  const today = new Date("2026-11-01T21:42:00Z");
  it("allows age 18 on the exact birthday", () => { expect(identityAge("2008-11-01", today)).toBe(18); });
  it("does not count the eighteenth birthday early", () => { expect(identityAge("2008-11-02", today)).toBe(17); });
  it("rejects invalid dates", () => { expect(identityAge("2008-02-30", today)).toBeNull(); });
  it("rejects future dates", () => { expect(identityAge("2030-01-01", today)).toBeNull(); });
  it("limits private ID images to 10 MiB", () => { expect(validIdentityImage({type:"image/jpeg",size:10485760})).toBe(true); expect(validIdentityImage({type:"image/jpeg",size:10485761})).toBe(false); });
  it("rejects non-image and SVG uploads", () => { expect(validIdentityImage({type:"image/svg+xml",size:100})).toBe(false); expect(validIdentityImage({type:"text/html",size:100})).toBe(false); });
});
