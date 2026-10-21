import { beforeEach, describe, expect, it } from "vitest";
import { rankByInterest, readBrowsePosition, readInterests, recordInterest, saveBrowsePosition, teaserTapAction } from "@/lib/teaserBrowse";

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
  it("keeps each country's most-viewed interests separate per customer", () => {
    recordInterest("customer-a", "women:US", ["creator:luna", "tag:Cosplay"]);
    recordInterest("customer-a", "women:US", ["creator:luna"]);
    expect(readInterests("customer-a", "women:US")).toEqual({ "creator:luna": 2, "tag:Cosplay": 1 });
    expect(readInterests("customer-a", "women:BR")).toEqual({});
    expect(readInterests("customer-b", "women:US")).toEqual({});
    expect(rankByInterest([{ creatorId: "other" }, { creatorId: "luna" }], readInterests("customer-a", "women:US"))).toEqual([{ creatorId: "luna" }]);
  });
});