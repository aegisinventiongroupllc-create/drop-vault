import { toCanvas } from "html-to-image";

export const WALLPAPER_VIDEO = { width: 720, height: 1560, fps: 24, seconds: 10 } as const;

/** Silent local H.264 MP4 for Samsung Gallery; no media or account data leaves the browser. */
export async function createLockScreenVideo(element: HTMLElement, signal: AbortSignal, progress: (percent: number) => void): Promise<Blob> {
  if (typeof MediaRecorder === "undefined") throw new Error("Video saving needs an updated Chrome browser. You can still save the image.");
  const mimeType = ["video/mp4;codecs=avc1.42E01E", "video/webm;codecs=vp8", "video/webm"].find(type => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error("This browser cannot record wallpaper. Try Chrome or save the image.");
  const globe = element.querySelector<HTMLCanvasElement>("[data-wallpaper-globe] canvas");
  if (!globe) throw new Error("The globe is still loading. Please retry.");
  await document.fonts.ready;
  const background = await toCanvas(element, { pixelRatio: WALLPAPER_VIDEO.width / element.clientWidth, skipFonts: true, filter: node => !(node instanceof HTMLElement && node.hasAttribute("data-wallpaper-globe")) });
  const canvas = document.createElement("canvas");
  canvas.width = WALLPAPER_VIDEO.width; canvas.height = WALLPAPER_VIDEO.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Video saving is unavailable.");
  const stream = canvas.captureStream(WALLPAPER_VIDEO.fps);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  let recordingError = false;
  recorder.onerror = () => { recordingError = true; };
  const stopped = new Promise<void>(resolve => { recorder.onstop = () => resolve(); });
  const bounds = element.getBoundingClientRect();
  const globeBounds = globe.getBoundingClientRect();
  const scale = canvas.width / bounds.width;
  try {
    recorder.start();
    const started = performance.now();
    while (performance.now() - started < WALLPAPER_VIDEO.seconds * 1000) {
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      if (document.hidden) throw new Error("Keep DTT visible while preparing the video. Please retry.");
      if (recordingError) throw new Error("Recording failed. Please retry.");
      // Gentle cyclic drift, with the live globe and city glints drawn from WebGL.
      const fraction = (performance.now() - started) / (WALLPAPER_VIDEO.seconds * 1000);
      const shift = Math.sin(fraction * Math.PI * 2) * canvas.width * .01;
      ctx.drawImage(background, -canvas.width * .02 + shift, -canvas.height * .02, canvas.width * 1.04, canvas.height * 1.04);
      ctx.drawImage(globe, (globeBounds.left - bounds.left) * scale, (globeBounds.top - bounds.top) * scale, globeBounds.width * scale, globeBounds.height * scale);
      progress(Math.min(75, Math.round(fraction * 75)));
      await new Promise(resolve => window.setTimeout(resolve, 1000 / WALLPAPER_VIDEO.fps));
    }
    recorder.stop(); await stopped;
    const recorded = new Blob(chunks, { type: mimeType });
    if (!recorded.size) throw new Error("Video recording was empty. Please retry.");
    if (mimeType.startsWith("video/mp4")) { progress(100); return new Blob([recorded], { type: "video/mp4" }); }
    const { convertWallpaperToMp4 } = await import("./lockScreenVideoConvert");
    return await convertWallpaperToMp4(recorded, signal, progress);
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
    stream.getTracks().forEach(track => track.stop());
  }
}