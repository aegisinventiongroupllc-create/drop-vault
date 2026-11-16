import { expect, it } from "vitest";
import { ADAPTIVE_TAGS, matchesAdaptiveTags, parseAdaptiveTags } from "@/lib/adaptiveTags";
it("allows no optional tags and only the four self-selected descriptors", () => {
  expect(parseAdaptiveTags([])).toEqual([]);
  expect(parseAdaptiveTags([...ADAPTIVE_TAGS, "unverified-medical-label", "adaptive-creator"])).toEqual([...ADAPTIVE_TAGS]);
});
it("requires all selected adaptive filters without broadening creator categories", () => {
  expect(matchesAdaptiveTags([], [])).toBe(true);
  expect(matchesAdaptiveTags(["adaptive-creator"], ["adaptive-creator", "sensory-inclusive"])).toBe(false);
  expect(matchesAdaptiveTags(["adaptive-creator", "sensory-inclusive"], ["sensory-inclusive"])).toBe(true);
});