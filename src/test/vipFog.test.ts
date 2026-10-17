import { describe, expect, it } from "vitest";
import { normalizeFogIntensity } from "@/lib/vipFog";
describe("dashboard fog controls", () => {
  it("allows clear fog", () => expect(normalizeFogIntensity(0)).toBe(0));
  it("allows maximum fog", () => expect(normalizeFogIntensity(100)).toBe(100));
  it("keeps a lower intensity", () => expect(normalizeFogIntensity(25)).toBe(25));
});