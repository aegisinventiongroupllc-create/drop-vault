/** Longest teaser a creator may upload, in seconds. */
export const MAX_TEASER_SECONDS = 60;

/**
 * When a locked teaser pauses for the "make her your girl / him your guy" pop-up:
 * exactly halfway through the video. Returns null when the length is unknown.
 */
export function teaserGateTime(durationSeconds: number): number | null {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;
  return durationSeconds / 2;
}

/** Reads a video file's length in the browser. */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration); };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read the video length.")); };
    v.src = url;
  });
}

export function isTeaserTooLong(durationSeconds: number): boolean {
  return durationSeconds > MAX_TEASER_SECONDS + 0.5;
}
