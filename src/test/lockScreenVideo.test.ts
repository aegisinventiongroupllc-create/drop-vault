import { describe, expect, it } from "vitest";
import { WALLPAPER_VIDEO, createLockScreenVideo } from "@/lib/lockScreenVideo";

describe("phone wallpaper export", () => {
  it("uses a silent-video compatible portrait format that loops every 30 seconds", () => {
    expect(WALLPAPER_VIDEO.seconds).toBe(30);
    expect(WALLPAPER_VIDEO.width).toBe(720);
    expect(WALLPAPER_VIDEO.height).toBe(1560);
  });
  it("rejects an unsupported browser rather than reporting a successful video", async () => {
    await expect(createLockScreenVideo(document.createElement("div"), new AbortController().signal, () => {})).rejects.toThrow("updated Chrome");
  });
});