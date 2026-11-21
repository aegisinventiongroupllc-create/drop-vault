import { describe, expect, it } from "vitest";
import { WALLPAPER_VIDEO, createLockScreenVideo } from "@/lib/lockScreenVideo";

describe("phone wallpaper export", () => {
  it("uses a silent-video compatible portrait format that loops every 30 seconds", () => {
    expect(WALLPAPER_VIDEO.seconds).toBe(30);
    expect(WALLPAPER_VIDEO.width).toBe(720);
    expect(WALLPAPER_VIDEO.height).toBe(1560);
  });
  it("rejects an unsupported browser rather than reporting a successful video", async () => {
    await expect(createLockScreenVideo(document.createElement("div"), new AbortController().signal, () => {})).rejects.toThrow();
  });
});
describe("seamless 30-second lock-screen loop", () => {
  it("finishes every shooting star before the video restarts", async () => {
    const { WALLPAPER_SHOOTING_STARS, LOOP_BLEND_SECONDS, SHOOT_SECONDS } = await import("@/lib/lockScreenVideo");
    expect(WALLPAPER_SHOOTING_STARS.length).toBeGreaterThanOrEqual(4);
    for (const start of WALLPAPER_SHOOTING_STARS) expect(start + SHOOT_SECONDS).toBeLessThan(30 - LOOP_BLEND_SECONDS);
  });
  it("breathes the globe back to its starting size at the loop point", async () => {
    const { globeBreath } = await import("@/lib/lockScreenVideo");
    expect(globeBreath(30)).toBeCloseTo(globeBreath(0), 6);
    expect(globeBreath(2.5)).toBeGreaterThan(1.05);
  });
});
