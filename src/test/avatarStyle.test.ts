import { describe, expect, it } from "vitest";
import { buildAvatarPrompt } from "../../supabase/functions/generate-avatar-portrait/avatar-style";

describe("avatar prompt style", () => {
  it("uses a realistic, vibrant, flattering creator style", () => {
    const prompt = buildAvatarPrompt("creator", "woman");
    expect(prompt).toContain("near-photoreal");
    expect(prompt).toContain("vibrant");
    expect(prompt).toContain("gently slim it a little");
    expect(prompt).toContain("No nudity");
  });

  it.each(["woman", "man"] as const)("uses drawn cel-shaded cartoons for customer %s portraits", (presentation) => {
    const prompt = buildAvatarPrompt("customer", presentation);
    expect(prompt).toContain("professionally DRAWN CARTOON");
    expect(prompt).toContain("crisp dark contour outlines");
    expect(prompt).toContain("cel-shaded shadow shapes");
    expect(prompt).toContain("NOT a realistic 3D render");
    expect(prompt).not.toContain("UNIFORM ART DIRECTION");
    expect(prompt).not.toContain("soft cool frontal studio light");
    expect(prompt).not.toContain("smooth matte clay-like materials");
  });

  it("keeps customer identity discreet and creator identity recognizable", () => {
    expect(buildAvatarPrompt("customer", "man")).toContain("CUSTOMER CARTOON OVERRIDE");
    expect(buildAvatarPrompt("customer", "man")).toContain("Privacy matters more than exact resemblance");
    expect(buildAvatarPrompt("creator", "man")).not.toContain("CUSTOMER CARTOON OVERRIDE");
    expect(buildAvatarPrompt("customer", "man")).toContain("redesigning exact biometric measurements");
    expect(buildAvatarPrompt("creator", "man")).toContain("look clearly like themselves");
  });

  it("uses the selected presentation without changing quality", () => {
    expect(buildAvatarPrompt("customer", "woman")).toContain("Presentation mode is woman");
    expect(buildAvatarPrompt("creator", "man")).toContain("Presentation mode is man");
  });

  it("keeps distinctive traits and the selfie expression", () => {
    const prompt = buildAvatarPrompt("customer", "man");
    expect(prompt).toContain("eye color");
    expect(prompt).toContain("visible facial tattoos");
    expect(prompt).toContain("kiss face");
    expect(prompt).toContain("intimidating");
  });
});