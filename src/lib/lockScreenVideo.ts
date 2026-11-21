import type { GlobeFrameController } from "@/components/MiniGlobe";

export const WALLPAPER_VIDEO = { width: 1080, height: 2340, fps: 30, seconds: 30 } as const;
/** Final second blends into the opening frame so the restart has no visible jump. */
export const LOOP_BLEND_SECONDS = 1;
/** Shooting stars finish well inside the loop so none are cut at the restart. */
export const WALLPAPER_SHOOTING_STARS = [2.5, 8, 13.5, 19, 24.5] as const;
export const SHOOT_SECONDS = 2.2;

const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

type Twinkle = { x: number; y: number; r: number; cycles: number; phase: number; glint: boolean };
const twinkles = (() => {
  const rand = seeded(20270101);
  return Array.from({ length: 90 }, (): Twinkle => ({ x: rand(), y: rand(), r: .6 + rand() * 1.6, cycles: 1 + Math.floor(rand() * 6), phase: rand() * Math.PI * 2, glint: rand() > .8 }));
})();
const shooters = (() => {
  const rand = seeded(777);
  return WALLPAPER_SHOOTING_STARS.map(start => {
    const dir = rand() > .5 ? 1 : -1;
    // Start on the side it flies away from, so the whole streak stays on screen.
    return { start, dir, x: dir > 0 ? .05 + rand() * .3 : .65 + rand() * .3, y: .05 + rand() * .4 };
  });
})();

/** Every value repeats exactly after WALLPAPER_VIDEO.seconds. */
export function drawWallpaperSky(ctx: CanvasRenderingContext2D, background: CanvasImageSource, t: number) {
  const { width: w, height: h, seconds } = WALLPAPER_VIDEO;
  const loop = (t / seconds) * Math.PI * 2;
  const k = w / 720;
  const shiftX = Math.sin(loop) * w * .012, shiftY = Math.cos(loop) * h * .006;
  ctx.globalAlpha = 1;
  ctx.drawImage(background, -w * .03 + shiftX, -h * .02 + shiftY, w * 1.06, h * 1.04);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const star of twinkles) {
    const s = .5 + .5 * Math.sin(loop * star.cycles + star.phase);
    const a = .15 + .85 * s * s * s;
    const x = star.x * w, y = star.y * h, r = star.r * 2.4 * k;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    glow.addColorStop(0, `rgba(255,235,248,${a})`); glow.addColorStop(1, "rgba(255,120,200,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();
    if (star.glint && a > .55) {
      ctx.strokeStyle = `rgba(255,245,252,${(a - .55) * 1.8})`; ctx.lineWidth = 1.2 * k;
      ctx.beginPath(); ctx.moveTo(x - r * 9, y); ctx.lineTo(x + r * 9, y); ctx.moveTo(x, y - r * 9); ctx.lineTo(x, y + r * 9); ctx.stroke();
    }
  }
  for (const shot of shooters) {
    const p = (t - shot.start) / SHOOT_SECONDS;
    if (p < 0 || p > 1) continue;
    const life = Math.sin(p * Math.PI);
    const len = w * .6, dx = shot.dir * .8, dy = .45;
    const hx = shot.x * w + dx * len * p, hy = shot.y * h + dy * len * p;
    const tail = len * .55;
    const trail = ctx.createLinearGradient(hx, hy, hx - dx * tail, hy - dy * tail);
    trail.addColorStop(0, `rgba(255,255,255,${life})`); trail.addColorStop(.25, `rgba(255,170,225,${life * .7})`); trail.addColorStop(1, "rgba(255,90,190,0)");
    ctx.strokeStyle = trail; ctx.lineWidth = 5 * k; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - dx * tail, hy - dy * tail); ctx.stroke();
    const head = ctx.createRadialGradient(hx, hy, 0, hx, hy, 22 * k);
    head.addColorStop(0, `rgba(255,255,255,${life})`); head.addColorStop(1, "rgba(255,150,220,0)");
    ctx.fillStyle = head; ctx.beginPath(); ctx.arc(hx, hy, 22 * k, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Gentle breathing like the Be Right Back globe: six swells per 30-second loop. */
export const globeBreath = (t: number) => 1 + .035 * (1 - Math.cos((t / 5) * Math.PI * 2));

type Frame = (ctx: CanvasRenderingContext2D, t: number) => void;

async function encodeExact(canvas: HTMLCanvasElement, draw: Frame, signal: AbortSignal, progress: (p: number) => void): Promise<Blob | null> {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return null;
  const { width, height, fps, seconds } = WALLPAPER_VIDEO;
  let codec = "";
  for (const candidate of ["avc1.640033", "avc1.4d0033", "avc1.420033", "avc1.640032"]) {
    try { if ((await VideoEncoder.isConfigSupported({ codec: candidate, width, height, bitrate: 18_000_000, framerate: fps })).supported) { codec = candidate; break; } } catch { /* try next */ }
  }
  if (!codec) return null;
  const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width, height, frameRate: fps }, fastStart: "in-memory" });
  let failure: unknown = null;
  const encoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: e => { failure = e; } });
  encoder.configure({ codec, width, height, bitrate: 18_000_000, framerate: fps, avc: { format: "avc" } });
  const ctx = canvas.getContext("2d")!;
  const frames = fps * seconds;
  try {
    for (let i = 0; i < frames; i++) {
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      if (failure) throw new Error("Video preparation failed. Please retry.");
      draw(ctx, i / fps);
      const frame = new VideoFrame(canvas, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      progress(Math.round((i + 1) / frames * 98));
      while (encoder.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 4));
      if (i % 4 === 0) await new Promise(r => setTimeout(r, 0));
    }
    await encoder.flush();
    if (failure) throw new Error("Video preparation failed. Please retry.");
    muxer.finalize();
    progress(100);
    return new Blob([muxer.target.buffer], { type: "video/mp4" });
  } finally { if (encoder.state !== "closed") encoder.close(); }
}

async function recordRealtime(canvas: HTMLCanvasElement, draw: Frame, signal: AbortSignal, progress: (p: number) => void): Promise<Blob> {
  if (typeof MediaRecorder === "undefined") throw new Error("Video saving needs an updated Chrome browser. You can still save the image.");
  const mimeType = ["video/mp4;codecs=avc1.42E01E", "video/webm;codecs=vp8", "video/webm"].find(type => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error("This browser cannot record wallpaper. Try Chrome or save the image.");
  const ctx = canvas.getContext("2d")!;
  const stream = canvas.captureStream(WALLPAPER_VIDEO.fps);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  const stopped = new Promise<void>(resolve => { recorder.onstop = () => resolve(); });
  try {
    recorder.start();
    const started = performance.now();
    for (;;) {
      const t = (performance.now() - started) / 1000;
      if (t >= WALLPAPER_VIDEO.seconds) break;
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      draw(ctx, t);
      progress(Math.min(75, Math.round(t / WALLPAPER_VIDEO.seconds * 75)));
      await new Promise(r => setTimeout(r, 1000 / WALLPAPER_VIDEO.fps));
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

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.onload = () => resolve(image); image.onerror = () => reject(new Error("The galaxy is still loading. Please retry."));
  image.src = src;
});

/**
 * Paints the wallpaper sky (without the globe) at video size straight from
 * the chosen galaxy photo or live star canvas, with the same tint and shade.
 */
export async function captureWallpaperSky(element: HTMLElement): Promise<HTMLCanvasElement> {
  const { width: w, height: h } = WALLPAPER_VIDEO;
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Video saving is unavailable.");
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
  const tile = element.querySelector<HTMLElement>(".galaxy-reel-track > div");
  const url = tile && /url\((['"]?)(.*?)\1\)/.exec(getComputedStyle(tile).backgroundImage)?.[2];
  if (url) {
    const photo = await loadImage(url);
    const cover = Math.max(w / photo.naturalWidth, h / photo.naturalHeight);
    const pw = photo.naturalWidth * cover, ph = photo.naturalHeight * cover;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.filter = "contrast(1.2) saturate(1.45) brightness(1.02)";
    ctx.drawImage(photo, (w - pw) / 2, (h - ph) / 2, pw, ph);
    ctx.filter = "none";
    const tint = element.querySelector<HTMLElement>(".galaxy-photo-tint");
    if (tint) {
      ctx.globalCompositeOperation = "color"; ctx.globalAlpha = .6;
      ctx.fillStyle = getComputedStyle(tint).backgroundColor; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    }
  } else {
    const stars = Array.from(element.querySelectorAll("canvas")).find(canvas => !canvas.closest("[data-wallpaper-globe]"));
    if (stars) ctx.drawImage(stars, 0, 0, w, h);
  }
  const shade = element.querySelector<HTMLElement>("[data-wallpaper-shade]");
  if (shade) { ctx.fillStyle = getComputedStyle(shade).backgroundColor; ctx.fillRect(0, 0, w, h); }
  return out;
}

/**
 * Silent local H.264 MP4 for Samsung Gallery; nothing leaves the browser.
 * Frames are rendered one by one at exact times, so the globe truly spins,
 * country lights shimmer and shooting stars cross, then loop seamlessly.
 */
export async function createLockScreenVideo(element: HTMLElement, signal: AbortSignal, progress: (percent: number) => void, globe?: GlobeFrameController | null): Promise<Blob> {
  if (typeof VideoEncoder === "undefined" && typeof MediaRecorder === "undefined") throw new Error("Video saving needs an updated Chrome browser. You can still save the image.");
  const globeHost = element.querySelector<HTMLElement>("[data-wallpaper-globe] canvas");
  if (!globe || !globeHost) throw new Error("The globe is still loading. Please retry.");
  await document.fonts.ready;
  const { width, height, seconds } = WALLPAPER_VIDEO;
  const background = await captureWallpaperSky(element);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const bounds = element.getBoundingClientRect();
  const g = globeHost.getBoundingClientRect();
  const scale = width / bounds.width;
  const cx = (g.left - bounds.left + g.width / 2) * scale, cy = (g.top - bounds.top + g.height / 2) * scale;
  const gw = g.width * scale, gh = g.height * scale;
  const drawGlobe = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
    globe.renderAt(t);
    const s = globeBreath(t);
    ctx.globalAlpha = alpha;
    ctx.drawImage(globe.canvas, cx - gw * s / 2, cy - gh * s / 2, gw * s, gh * s);
    ctx.globalAlpha = 1;
  };
  const draw: Frame = (ctx, t) => {
    drawWallpaperSky(ctx, background, t);
    const breath = globeBreath(t) - 1;
    ctx.save();
    ctx.shadowColor = `rgba(255,60,170,${.3 + breath * 6})`; ctx.shadowBlur = (20 + breath * 300) * (width / 720);
    ctx.imageSmoothingQuality = "high";
    drawGlobe(ctx, t, 1);
    ctx.restore();
    const blend = (t - (seconds - LOOP_BLEND_SECONDS)) / LOOP_BLEND_SECONDS;
    if (blend > 0) drawGlobe(ctx, t - seconds, blend);
  };
  globe.pause();
  try {
    return (await encodeExact(canvas, draw, signal, progress)) ?? await recordRealtime(canvas, draw, signal, progress);
  } finally { globe.resume(); }
}
