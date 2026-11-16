import { describe, expect, it } from "vitest";
import { CREATOR_CATEGORIES, matchesCategory } from "@/lib/creatorCategories";
describe("explicit discovery categories", () => {
  it("offers exactly four creator categories", () => expect(CREATOR_CATEGORIES).toEqual(["women", "men", "trans_women", "trans_men"]));
  it("general browsing includes Women and Men only", () => expect(CREATOR_CATEGORIES.filter(category => matchesCategory(category, undefined))).toEqual(["women", "men"]));
  it.each(CREATOR_CATEGORIES)("%s never broadens to another category", selected => expect(CREATOR_CATEGORIES.filter(category => matchesCategory(category, selected))).toEqual([selected]));
  it("missing or unrecognized categories never become Women", () => { expect(matchesCategory(null, "women")).toBe(false); expect(matchesCategory("unknown", "both")).toBe(false); });
});