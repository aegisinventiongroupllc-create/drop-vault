import { describe, expect, it } from "vitest";
import { parseCreatorBackdrop, searchCreatorBackdrops } from "@/lib/creatorBackdrop";
describe("curated public backdrops", () => {
  it("accepts known designs only, not external URLs", () => {
    expect(parseCreatorBackdrop("cluster")).toBe("cluster");
    expect(parseCreatorBackdrop("https://example.com/tracker.jpg")).toBeUndefined();
  });
  it("finds designs by interest", () => {
    expect(searchCreatorBackdrops("blue gaming").map((item) => item.id)).toEqual(["blueMeteor"]);
  });
});