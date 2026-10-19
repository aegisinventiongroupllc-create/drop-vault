import { describe, expect, it } from "vitest";
import { foundingCountries, foundingSlots } from "@/lib/foundingCreators";
import { isBlockedCountry } from "@/lib/restrictedCountries";

describe("per-country founding slots", () => {
  it("keeps ten places when a country has no creators", () => {
    const slots = foundingSlots([], "US", "women");
    expect(slots.map((s) => s.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(slots.every((s) => s.creator === null)).toBe(true);
  });
  it("preserves three claimed creators and seven available positions", () => {
    const rows = [1, 2, 3].map((slot) => ({ creator_id: `creator-${slot}`, country: "US", vault_side: "women" as const, slot }));
    const slots = foundingSlots(rows, "US", "women");
    expect(slots.filter((s) => s.creator).map((s) => s.creator?.creator_id)).toEqual(["creator-1", "creator-2", "creator-3"]);
    expect(slots.filter((s) => !s.creator)).toHaveLength(7);
  });
  it("keeps men and women separate", () => {
    const rows = [{ creator_id: "man", country: "US", vault_side: "men" as const, slot: 1 }];
    expect(foundingSlots(rows, "US", "women")[0].creator).toBeNull();
    expect(foundingSlots(rows, "US", "men")[0].creator?.creator_id).toBe("man");
  });
  it("keeps country awards separate", () => {
    expect(foundingSlots([{ creator_id: "man", country: "US", vault_side: "men", slot: 1 }], "CA", "men")[0].creator).toBeNull();
  });
  it("pauses South Africa without blocking all Africa", () => {
    expect(isBlockedCountry("ZA")).toBe(true);
    expect(isBlockedCountry("KE")).toBe(false);
    expect(foundingCountries().map((c) => c.code)).not.toContain("ZA");
  });
  it("pauses Japan pending review", () => {
    expect(isBlockedCountry("JP")).toBe(true);
    expect(foundingCountries().map((c) => c.code)).not.toContain("JP");
  });
  it("does not offer Worldwide or already blocked markets founding awards", () => {
    const codes = foundingCountries().map((c) => c.code);
    expect(codes).toContain("US");
    expect(codes).not.toContain("GLOBAL");
    expect(codes).not.toContain("IN");
    expect(codes).not.toContain("NG");
  });
});