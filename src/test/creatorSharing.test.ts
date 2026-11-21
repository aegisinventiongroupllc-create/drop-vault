import { beforeEach, describe, expect, it } from "vitest";
import { creatorShareUrl, creatorNamePattern, rememberCreator, savedCreator } from "@/lib/creatorSharing";

describe("creator library sharing", () => {
  beforeEach(() => localStorage.clear());
  it("creates a DTT creator link without payment or consent bypass parameters", () => {
    expect(creatorShareUrl("@neon_creator")).toBe("https://dropthatthing.com/creator/neon_creator");
    expect(new URL(creatorShareUrl("neon_creator") ?? "").search).toBe("");
  });
  it("keeps one creator link across reloads while customers wait", () => {
    rememberCreator("first_creator");
    expect(savedCreator()).toBe("first_creator");
    rememberCreator("next_creator");
    expect(savedCreator()).toBe("next_creator");
  });
  it("rejects external destinations and wildcard handles", () => {
    for (const value of ["https://evil.example", "../admin", "creator%", ".creator", "a", "a".repeat(25)]) {
      expect(creatorShareUrl(value)).toBeNull();
      expect(rememberCreator(value)).toBeNull();
    }
    expect(savedCreator()).toBeNull();
  });
  it("treats underscores in shared creator handles as literal characters", () => {
    expect(creatorNamePattern("dtt_share_audit")).toBe("dtt\\_share\\_audit");
    expect(creatorNamePattern("Dtt.creator")).toBe("Dtt.creator");
    expect(creatorNamePattern("creator%\\")).toBe("creator\\%\\\\");
  });
});