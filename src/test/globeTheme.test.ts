import { describe, expect, it } from "vitest";
import { DEFAULT_STAR_STYLE, activeTheme, loadTheme, previewTheme, resolveIdleSky, saveTheme, validateTheme } from "@/lib/userTheme";

describe("personal globe preferences", () => {
  it("uses the customer's or creator's main galaxy and color on idle when no separate sky was saved", () => {
    expect(resolveIdleSky({ starStyle: "blueMeteor", galaxy: "#14b8a6" })).toEqual({ style: "blueMeteor", tone: "#14b8a6" });
  });
  it("preserves a separately saved idle sky and its color", () => {
    expect(resolveIdleSky({ starStyle: "blueMeteor", galaxy: "#14b8a6", brbStyle: "cosmicGold", brbTone: "#ff0080" })).toEqual({ style: "cosmicGold", tone: "#ff0080" });
  });
  it("keeps original sky colors when explicitly saved without an idle tint", () => {
    expect(resolveIdleSky({ galaxy: "#14b8a6", brbStyle: "goldenMoon" })).toEqual({ style: "goldenMoon", tone: undefined });
  });
  it("keeps idle sky choices separate from the normal globe backdrop", () => {
    saveTheme({ brbStyle: "cosmicGold", brbTone: "#14b8a6" });
    expect(loadTheme().brbStyle).toBe("cosmicGold");
    expect(loadTheme().brbTone).toBe("#14b8a6");
    expect(loadTheme().starStyle).toBeUndefined();
    expect(loadTheme().galaxy).toBeUndefined();
    expect(loadTheme().dashboardSky).toBeUndefined();
    saveTheme({});
  });
  it("requires explicit dashboard opt-in and validates idle sky settings", () => {
    expect(validateTheme({ dashboardSky: "true", brbStyle: "invalid", brbTone: "url(unsafe)" })).toEqual({});
    expect(validateTheme({ dashboardSky: true, brbStyle: "goldenMoon", brbTone: "#ff0080" })).toEqual({ dashboardSky: true, brbStyle: "goldenMoon", brbTone: "#ff0080" });
  });
  it("uses the third photograph, Star cluster, as the default", () => {
    expect(DEFAULT_STAR_STYLE).toBe("cluster");
  });
  it("persists a personal galaxy tint with the Star cluster photograph", () => {
    saveTheme({ starStyle: "cluster", galaxy: "#14b8a6" });
    expect(loadTheme()).toEqual({ starStyle: "cluster", galaxy: "#14b8a6" });
    expect(document.documentElement.style.getPropertyValue("--galaxy-tone")).toBe("173 80% 40%");
    expect(validateTheme({ galaxy: "url(unsafe)" }).galaxy).toBeUndefined();
    saveTheme({});
    expect(document.documentElement.style.getPropertyValue("--galaxy-tone")).toBe("");
  });
  it("shows a galaxy color example on screen without saving it", () => {
    saveTheme({});
    previewTheme({ galaxy: "#ef4444" });
    expect(document.documentElement.style.getPropertyValue("--galaxy-tone")).toBe("0 84% 60%");
    expect(loadTheme()).toEqual({});
    expect(activeTheme().galaxy).toBe("#ef4444");
    saveTheme({});
    expect(activeTheme()).toEqual({});
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