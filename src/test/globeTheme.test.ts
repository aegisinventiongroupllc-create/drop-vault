import { describe, expect, it } from "vitest";
import { DEFAULT_STAR_STYLE, loadTheme, saveTheme, validateTheme } from "@/lib/userTheme";

describe("personal globe preferences", () => {
  it("uses the third photograph, Star cluster, as the default", () => {
    expect(DEFAULT_STAR_STYLE).toBe("cluster");
  });
  it("persists a personal galaxy tint with the Star cluster photograph", () => {
    saveTheme({ starStyle: "cluster", galaxy: "#14b8a6" });
    expect(loadTheme()).toEqual({ starStyle: "cluster", galaxy: "#14b8a6" });
    expect(document.documentElement.style.getPropertyValue("--galaxy-tone")).toBe("174 80% 40%");
    expect(validateTheme({ galaxy: "url(unsafe)" }).galaxy).toBeUndefined();
    saveTheme({});
    expect(document.documentElement.style.getPropertyValue("--galaxy-tone")).toBe("");
  });
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