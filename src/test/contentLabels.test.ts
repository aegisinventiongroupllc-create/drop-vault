import { describe, expect, it } from "vitest";
import { validContentLabels } from "@/lib/contentLabels";
describe("required standardized creator labels", () => {
  it("rejects missing labels", () => expect(validContentLabels([])).toBe(false));
  it("rejects labels outside the standardized list", () => expect(validContentLabels(["unrecognized"])).toBe(false));
  it("accepts explicit self-selected content and visibility labels", () => expect(validContentLabels(["twerking", "no-genitals-visible"])).toBe(true));
});