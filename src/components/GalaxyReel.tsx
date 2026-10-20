import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { hexToHsl, usePersonalGlobe, type StarStyle } from "@/lib/userTheme";
import { cn } from "@/lib/utils";
import { SKY_BACKDROPS } from "@/lib/skyBackdrops";

/**
 * Shared realistic star-field backdrop that drifts slowly left-to-right and
 * loops forever. Either living canvas stars or a real astrophotography
 * panorama chosen by the viewer, panned slowly like a reel. Tinted with the
   * viewer's chosen backdrop color while retaining bright stellar highlights.
  */

const PHOTO_BACKDROPS = SKY_BACKDROPS;

interface Star {
  x: number; // 0..1 of field width
  y: number; // 0..1 of height
  r: number; // radius px
  layer: number; // 0 far .. 2 near
  phase: number; // twinkle phase
  speed: number; // twinkle speed
  color: [number, number, number];
  glint: boolean; // brightest few get a diamond flare
}

// Realistic stellar color temperatures: blue-white hot → warm orange/amber cool.
const STAR_COLORS: [number, number, number][] = [
  [155, 194, 255],
  [202, 222, 255],
  [248, 249, 255],
  [255, 244, 224],
  [255, 226, 178],
  [255, 202, 148],
  [255, 178, 128],
];
const COLOR_WEIGHTS = [0.06, 0.16, 0.3, 0.24, 0.14, 0.07, 0.03];

const pickColor = () => {
  let roll = Math.random();
  for (let i = 0; i < STAR_COLORS.length; i++) {
    roll -= COLOR_WEIGHTS[i];
    if (roll <= 0) return STAR_COLORS[i];
  }
  return STAR_COLORS[2];
};

const buildStars = (count: number): Star[] => {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const layer = i < count * 0.55 ? 0 : i < count * 0.85 ? 1 : 2;
    // Power distribution: a sea of faint pinpoint stars, a few bright beacons.
    const bright = Math.pow(Math.random(), 3.0);
    const r = (layer === 0 ? 0.4 : layer === 1 ? 0.6 : 0.9) * (0.45 + bright * 2.1);
    stars.push({
      x: Math.random(),
      y: Math.random(),
      r,
      layer,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.1,
      color: pickColor(),
      // Diamond glints on the genuinely bright beacons, near layers only.
      glint: bright > 0.86 && layer >= 1,
    });
  }
  return stars;
};

const GalaxyReel = ({ className, seconds = 240, scope = "globe", styleOverride, toneOverride }: { className?: string; seconds?: number; scope?: "globe" | "brb"; styleOverride?: StarStyle; toneOverride?: string }) => {
  const personal = usePersonalGlobe();
  const { reduced } = personal;
  const starStyle = styleOverride ?? (scope === "brb" ? personal.brbStyle : personal.starStyle);
  const galaxyTone = toneOverride ?? (scope === "brb" ? personal.brbTone : personal.galaxyTone);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stars = useMemo(() => buildStars(1050), []);
  const toneRef = useRef<string | null>(galaxyTone ?? null);
  toneRef.current = galaxyTone ?? null;
  const photoSrc = starStyle && starStyle !== "living" ? PHOTO_BACKDROPS[starStyle] : null;

  const [loadedPhoto, setLoadedPhoto] = useState<string | null>(null);
  const activePhotoSrc = loadedPhoto === photoSrc ? photoSrc : null;

  useEffect(() => {
    if (!photoSrc) return;
    let disposed = false;
    let image: HTMLImageElement | null = null;
    let loading = false;
    let loaded = false;
    const load = () => {
      if (disposed || loading || loaded || document.hidden) return;
      loading = true;
      image = new Image();
      image.onload = () => {
        loading = false;
        if (disposed) return;
        loaded = true;
        setLoadedPhoto(photoSrc);
      };
      image.onerror = () => {
        loading = false;
        if (!disposed) setLoadedPhoto(null);
      };
      image.src = photoSrc;
    };
    load();
    document.addEventListener("visibilitychange", load);
    window.addEventListener("pageshow", load);
    window.addEventListener("online", load);
    return () => {
      disposed = true;
      if (image) { image.onload = null; image.onerror = null; }
      document.removeEventListener("visibilitychange", load);
      window.removeEventListener("pageshow", load);
      window.removeEventListener("online", load);
    };
  }, [photoSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let disposed = false;
    let w = 0;
    let h = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Layer drift speeds: px/s, very slow left-to-right like a gentle reel.
    const layerSpeed = [w / (seconds * 4), w / (seconds * 2.2), w / (seconds * 1.35)];
    const start = performance.now();
    const staticDraw = () => {
      ctx.clearRect(0, 0, w, h);
      drawStars(0, toneRef.current, ctx, stars, w, h, [0, 0, 0]);
    };

    const frame = (now: number) => {
      if (disposed) return;
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      drawStars(t, toneRef.current, ctx, stars, w, h, layerSpeed);
      raf = requestAnimationFrame(frame);
    };

    if (reduced) {
      staticDraw();
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reduced, seconds, stars, activePhotoSrc]);

  if (activePhotoSrc) {
    return (
      <div className={cn("pointer-events-none absolute inset-0 isolate overflow-hidden bg-background", className)} style={{ "--galaxy-tone": galaxyTone ? hexToHsl(galaxyTone) : undefined } as CSSProperties} aria-hidden>
        <div
          className="galaxy-reel-track flex h-full w-[400%]"
          style={{ animationDuration: `${seconds * 2}s` }}
        >
          {[0, 1, 2, 3].map((frame) => (
            <div key={frame} className={cn("h-full w-1/4 shrink-0 bg-cover bg-center", frame % 2 === 1 && "scale-x-[-1]")}
              style={{ backgroundImage: `url(${JSON.stringify(activePhotoSrc)})` }} />
          ))}
        </div>
        {galaxyTone && <div className="galaxy-photo-tint absolute inset-0" />}
      </div>
    );
  }

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden bg-background", className)} aria-hidden>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
};

const drawStars = (
  t: number,
  tone: string | null,
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  w: number,
  h: number,
  layerSpeed: number[],
) => {
  if (!(w > 0) || !(h > 0)) return; // Zero-size canvas (e.g. mid-style-switch) would make positions NaN.
  // Faint deep-space haze behind everything, tinted by the chosen color.
  const haze = tone ?? "#1a1440";
  const [hr, hg, hb] = hexToRgb(haze);
  const g1 = ctx.createRadialGradient(w * 0.28, h * 0.35, 0, w * 0.28, h * 0.35, Math.max(w, h) * 0.75);
  g1.addColorStop(0, `rgba(${hr},${hg},${hb},0.16)`);
  g1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, w, h);
  const g2 = ctx.createRadialGradient(w * 0.78, h * 0.68, 0, w * 0.78, h * 0.68, Math.max(w, h) * 0.7);
  g2.addColorStop(0, `rgba(${hr},${hg},${hb},0.1)`);
  g2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, w, h);

  for (const s of stars) {
    const speed = layerSpeed[s.layer];
    // Drift left-to-right, wrapping seamlessly.
    const x = ((s.x * w + (speed * t) % w) % (w + 8)) - 4;
    const y = s.y * h;
    // Two-wave twinkle: a slow swell plus a quick shimmer, like real scintillation.
    const slow = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
    const fast = 0.5 + 0.5 * Math.sin(t * (s.speed * 3.1 + 0.7) + s.phase * 2.3);
    const tw = 0.55 + 0.45 * Math.pow(slow, 1.4) * (0.82 + 0.18 * fast);
    const alpha = (s.layer === 0 ? 0.55 : s.layer === 1 ? 0.8 : 1.0) * tw;
    const [r, g, b] = s.color;

    // Realistic diffraction glow: a tight white-hot core inside a soft halo.
    if (s.r > 0.9) {
      const haloR = s.r * (s.glint ? 7 : 5.5);
      const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
      halo.addColorStop(0, `rgba(255,255,255,${alpha * 0.5})`);
      halo.addColorStop(0.25, `rgba(${r},${g},${b},${alpha * 0.35})`);
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, haloR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bright core: white center ringed by the star's own color.
    const core = ctx.createRadialGradient(x, y, 0, x, y, s.r * 1.4);
    core.addColorStop(0, `rgba(255,255,255,${Math.min(1, alpha * 1.15)})`);
    core.addColorStop(0.6, `rgba(${r},${g},${b},${alpha})`);
    core.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, s.r * 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Diamond glint on the brightest few — like a star catching the eye.
    if (s.glint) {
      const flare = Math.pow(tw, 2.4);
      const len = s.r * 8 * flare;
      if (len > 0.6) {
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.85 * flare})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(x - len, y);
        ctx.lineTo(x + len, y);
        ctx.moveTo(x, y - len);
        ctx.lineTo(x, y + len);
        // Shorter diagonal rays for a true diffraction-spike look.
        const dlen = len * 0.45;
        ctx.moveTo(x - dlen, y - dlen);
        ctx.lineTo(x + dlen, y + dlen);
        ctx.moveTo(x - dlen, y + dlen);
        ctx.lineTo(x + dlen, y - dlen);
        ctx.stroke();
      }
    }
  }
};

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return [26, 20, 64];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
};

export default GalaxyReel;
