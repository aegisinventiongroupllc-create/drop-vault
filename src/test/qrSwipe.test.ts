import { describe, expect, it } from "vitest";
import { createQrSwipe, inQrCorner } from "@/lib/qrSwipe";
const W = 400, H = 800;
const run = (ys: number[], x = 30, gap = 50) => { const s = createQrSwipe(); s.start(x, ys[0], W, H, 0); return ys.slice(1).some((y, i) => s.move(y, (i + 1) * gap)); };
describe("creator QR swipe", () => {
  it("only starts in the bottom-left or bottom-right corner", () => {
    expect(inQrCorner(30, 700, W, H)).toBe(true);
    expect(inQrCorner(370, 700, W, H)).toBe(true);
    expect(inQrCorner(200, 700, W, H)).toBe(false);
    expect(inQrCorner(30, 300, W, H)).toBe(false);
  });
  it("opens after up-down two times", () => expect(run([760, 700, 760, 700, 760])).toBe(true));
  it("does not open after a single up-down", () => expect(run([760, 700, 760])).toBe(false));
  it("does not open from the middle of the screen", () => expect(run([760, 700, 760, 700, 760], 200)).toBe(false));
  it("expires when too slow", () => expect(run([760, 700, 760, 700, 760], 30, 1000)).toBe(false));
});
