import { describe, expect, it } from "vitest";
import { feedCountry, plainCaption, postLink, FEED_CATEGORIES } from "@/lib/feed";
describe("news feed rules", () => {
  it("Worldwide when no single country is chosen", () => { expect(feedCountry("GLOBAL")).toBe("WW"); expect(feedCountry("ca")).toBe("CA"); });
  it("keeps the five separate category pages", () => { expect(FEED_CATEGORIES.map(c => c.id)).toEqual(["women","men","trans_women","trans_men","adaptive"]); });
  it("share links point to the post, never a media file", () => { expect(postLink("https://dropthatthing.com","abc")).toBe("https://dropthatthing.com/?post=abc"); });
  it("keeps hashtags as plain text", () => { expect(plainCaption("hi #dance")).toBe("hi #dance"); });
});
