import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { profileBackdropImage, searchProfileBackdrops, validateBackdropFile } from "@/lib/profileBackdrops";
describe("profile backdrop rules", () => {
  it("finds interest designs rather than forcing galaxies", () => {
    expect(searchProfileBackdrops("gaming").map(item => item.id)).toEqual(["gaming"]);
    expect(searchProfileBackdrops("flowers").map(item => item.id)).toEqual(["spring"]);
  });
  it("offers matching designs for every season", () => {
    for (const [season, id] of [["Spring", "spring"], ["Summer", "summer"], ["Autumn", "autumn"], ["Winter", "winter"]]) {
      expect(searchProfileBackdrops("", "All", season).map(item => item.id)).toContain(id);
    }
    expect(searchProfileBackdrops("gaming", "All", "Winter")).toEqual([]);
  });
  it("combines category and search filters", () => {
    expect(searchProfileBackdrops("forest", "Nature", "Winter").map(item => item.id)).toEqual(["winter"]);
    expect(searchProfileBackdrops("gaming", "Cars")).toEqual([]);
  });
  it("never resolves remote URLs as designs", () => {
    expect(profileBackdropImage("https://example.com/track.jpg")).toBeUndefined();
    expect(profileBackdropImage("javascript:alert(1)")).toBeUndefined();
  });
  it("accepts supported still image formats", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) expect(() => validateBackdropFile({ type, size: 1024 })).not.toThrow();
  });
  it("rejects executable and animated image formats", () => {
    for (const type of ["image/svg+xml", "image/gif", "text/html"]) expect(() => validateBackdropFile({ type, size: 100 })).toThrow();
  });
  it("rejects empty and oversized uploads", () => {
    expect(() => validateBackdropFile({ type: "image/jpeg", size: 0 })).toThrow();
    expect(() => validateBackdropFile({ type: "image/jpeg", size: 5242881 })).toThrow();
    expect(() => validateBackdropFile({ type: "image/jpeg", size: 5242880 })).not.toThrow();
  });
});