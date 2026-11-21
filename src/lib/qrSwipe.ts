/** Bottom-corner "up-down twice" swipe that reveals a creator's QR code. */
export const QR_SWIPE = { corner: 0.3, bottom: 0.7, minTravel: 30, needed: 4, windowMs: 3000, showMs: 10_000 } as const;

export function inQrCorner(x: number, y: number, w: number, h: number): boolean {
  return y >= h * QR_SWIPE.bottom && (x <= w * QR_SWIPE.corner || x >= w * (1 - QR_SWIPE.corner));
}

/** Counts vertical strokes (up, down, up, down); returns true when complete. */
export function createQrSwipe() {
  let anchor = 0, dir = 0, strokes = 0, started = 0, active = false;
  return {
    start(x: number, y: number, w: number, h: number, now: number) {
      if (now - started > QR_SWIPE.windowMs) strokes = 0;
      active = inQrCorner(x, y, w, h);
      if (active && strokes === 0) started = now;
      anchor = y; dir = 0;
    },
    move(y: number, now: number): boolean {
      if (!active || now - started > QR_SWIPE.windowMs) return false;
      const delta = y - anchor;
      if (Math.abs(delta) < QR_SWIPE.minTravel) return false;
      const next = delta < 0 ? -1 : 1;
      if (next !== dir) {
        if (strokes === 0 && next !== -1) return false; // must begin with an upward swipe
        strokes++; dir = next;
      }
      anchor = y;
      if (strokes >= QR_SWIPE.needed) { strokes = 0; active = false; return true; }
      return false;
    },
  };
}
