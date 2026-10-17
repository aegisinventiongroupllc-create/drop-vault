import { describe, expect, it } from "vitest";
import { loadTheme, saveTheme, validateTheme } from "@/lib/userTheme";

describe("personal globe preferences", () => {
  it("retains a chosen six-digit globe tone and rejects invalid input", () => {
    expect(validateTheme({ globe: "#22c55e" }).globe).toBe("#22c55e");
    expect(validateTheme({ globe: "url(unsafe)" }).globe).toBeUndefined();
  });
  it("persists the optional multicolor choice with the personal tone", () => {
    saveTheme({ globe: "#ff0080", globeNeon: true });
    expect(loadTheme()).toEqual({ globe: "#ff0080", globeNeon: true });
    saveTheme({});
    expect(loadTheme()).toEqual({});
  });
  it("accepts neon mode only as an explicit boolean", () => {
    expect(validateTheme({ globeNeon: "true" }).globeNeon).toBeUndefined();
    expect(validateTheme({ globeNeon: false }).globeNeon).toBe(false);
  });
});