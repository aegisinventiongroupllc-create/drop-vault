import { describe, expect, it } from "vitest";
import { buildAvatarPrompt } from "../../supabase/functions/generate-avatar-portrait/avatar-style";

describe("avatar prompt style", () => {
  it.each(["customer", "creator"] as const)("enforces the uniform 3D style for %s accounts", (accountType) => {
    const prompt = buildAvatarPrompt(accountType, "woman");
    expect(prompt).toContain("professional 3D animated character portrait");
    expect(prompt).toContain("smooth matte clay-like materials");
    expect(prompt).toContain("Do not render pores");
    expect(prompt).toContain("hyper-realism");
  });

  it("keeps customer identity discreet and creator identity recognizable", () => {
    expect(buildAvatarPrompt("customer", "man")).toContain("redesigning exact biometric measurements");
    expect(buildAvatarPrompt("creator", "man")).toContain("recognizable 3D animated likeness");
  });

  it("uses the selected presentation without changing quality", () => {
    expect(buildAvatarPrompt("customer", "woman")).toContain("Presentation mode is woman");
    expect(buildAvatarPrompt("creator", "man")).toContain("Presentation mode is man");
  });
});