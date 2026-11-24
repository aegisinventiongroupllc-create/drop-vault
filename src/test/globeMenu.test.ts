import { describe, expect, it } from "vitest";
import { GLOBE_DESTINATIONS, orbitPositions } from "@/lib/globeMenu";

describe("globe menu", () => {
  it("spaces icons equally around the globe", () => {
    const p = orbitPositions(6, 0, 100, 40);
    const gaps = p.slice(1).map((q, i) => q.angle - p[i].angle);
    gaps.forEach((g) => expect(g).toBeCloseTo(Math.PI / 3));
  });
  it("creator globe offers media, drafts, calendar, requests and verify; no founder poke", () => {
    const ids = GLOBE_DESTINATIONS.creator.map((d) => d.id);
    expect(ids).toEqual(expect.arrayContaining(["media", "drafts", "calendar", "requests", "verification"]));
    expect(ids.some((id) => id.includes("poke"))).toBe(false);
  });
});
