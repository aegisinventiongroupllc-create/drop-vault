import { beforeEach, describe, expect, it } from "vitest";
import { readBrowsePosition, saveBrowsePosition, teaserTapAction } from "@/lib/teaserBrowse";

describe("customer teaser browsing", () => {
  beforeEach(() => localStorage.clear());
  it("plays on first tap and opens the library on a double tap", () => {
    expect(teaserTapAction(null, 1000)).toBe("play");
    expect(teaserTapAction(1000, 1200)).toBe("library");
    expect(teaserTapAction(1000, 1400)).toBe("play");
  });
  it("remembers position on next sign-in only for the same account and filter", () => {
    saveBrowsePosition("customer-a", "women:US", { top: 500, rows: { Cosplay: 240 } });
    expect(readBrowsePosition("customer-a", "women:US")).toEqual({ top: 500, rows: { Cosplay: 240 } });
    expect(readBrowsePosition("customer-b", "women:US").top).toBe(0);
    expect(readBrowsePosition("customer-a", "men:US").top).toBe(0);
    expect(readBrowsePosition(null, "women:US").top).toBe(0);
  });
});