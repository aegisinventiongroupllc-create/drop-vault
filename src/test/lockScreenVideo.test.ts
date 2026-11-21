import { describe, expect, it } from "vitest";
import { WALLPAPER_VIDEO, createLockScreenVideo } from "@/lib/lockScreenVideo";

describe("phone wallpaper export", () => {
  it("uses a silent-video compatible portrait format under Samsung’s 15-second limit", () => {
    expect(WALLPAPER_VIDEO.seconds).toBe(10);
    expect(WALLPAPER_VIDEO.seconds).toBeLessThan(15);
    expect(WALLPAPER_VIDEO.width).toBe(720);
    expect(WALLPAPER_VIDEO.height).toBe(1560);
  });
  it("rejects an unsupported browser rather than reporting a successful video", async () => {
    await expect(createLockScreenVideo(document.createElement("div"), new AbortController().signal, () => {})).rejects.toThrow("updated Chrome");
  });
});