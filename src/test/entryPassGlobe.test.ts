import { describe, expect, it } from "vitest";
import { ENTRY_GLOBE } from "@/components/EntryPassGlobe";

describe("shared entry and idle globe appearance", () => {
  it("retains the entry globe's pink surface, darker borders and white lights", () => {
    expect(ENTRY_GLOBE).toEqual({ tone: "#ff4da6", borderTone: "#d6337f", whiteLights: true });
  });
});