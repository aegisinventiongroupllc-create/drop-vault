export const CREATOR_PORTRAIT_MAX_SECONDS = 5;
export const CREATOR_PORTRAIT_MAX_BYTES = 8 * 1024 * 1024;

export function isVideoPortrait(path?: string | null) {
  return /\.(mp4|webm|mov)(?:[?#]|$)/i.test(path ?? "");
}

export function validatePortraitDuration(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0 || duration > CREATOR_PORTRAIT_MAX_SECONDS) {
    throw new Error("Choose a smile video lasting five seconds or less.");
  }
}

export async function checkPortraitVideo(file: File) {
  if (file.size > CREATOR_PORTRAIT_MAX_BYTES) throw new Error("Choose a video under 8 MB.");
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Couldn't read this video. Try an MP4 file.")), 15000);
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        try { validatePortraitDuration(video.duration); resolve(); } catch (error) { reject(error); }
      };
      video.onerror = () => { clearTimeout(timer); reject(new Error("Couldn't read this video. Try an MP4 file.")); };
      video.preload = "metadata";
      video.src = url;
    });
  } finally {
    video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url);
  }
}