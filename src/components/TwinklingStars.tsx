import { useEffect, useRef } from "react";
import { hexToHsl } from "@/lib/userTheme";

/** Independent pinpoint scintillation; no image, tracking or fullscreen flashes. */
export default function TwinklingStars({ color = "#ff0080" }: { color?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!element || !ctx) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const particles = Array.from({ length: 650 }, () => ({ x: Math.random(), y: Math.random(), radius: .35 + Math.random() ** 3 * 2.1, phase: Math.random() * Math.PI * 2, speed: 5 + Math.random() * 9 }));
    let width = 0, height = 0, frame = 0, previous = 0, time = 0;
    const resize = () => {
      const bounds = element.getBoundingClientRect();
      width = bounds.width; height = bounds.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      element.width = Math.max(1, Math.round(width * dpr));
      element.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (now: number) => {
      if (now - previous >= 33) {
        if (!document.hidden && !media.matches) time += Math.min((now - previous) / 1000, .05);
        previous = now;
        ctx.clearRect(0, 0, width, height);
        const hue = `hsl(${hexToHsl(color)})`;
        const core = getComputedStyle(element).getPropertyValue("--star-core").trim();
        particles.forEach((p) => {
          const x = p.x * width, y = p.y * height;
          const shimmer = media.matches ? .6 : .18 + .82 * ((1 + Math.sin(time * p.speed + p.phase)) / 2) ** 3;
          ctx.globalAlpha = shimmer;
          if (p.radius > 1) {
            const glow = ctx.createRadialGradient(x, y, 0, x, y, p.radius * 6);
            glow.addColorStop(0, hue); glow.addColorStop(1, "transparent");
            ctx.fillStyle = glow; ctx.fillRect(x - p.radius * 6, y - p.radius * 6, p.radius * 12, p.radius * 12);
          }
          ctx.fillStyle = p.radius > 1.6 ? core : hue;
          ctx.beginPath(); ctx.arc(x, y, p.radius, 0, Math.PI * 2); ctx.fill();
          if (p.radius > 1.9 && shimmer > .65) {
            ctx.strokeStyle = hue; ctx.lineWidth = .6;
            ctx.beginPath(); ctx.moveTo(x - p.radius * 3, y); ctx.lineTo(x + p.radius * 3, y); ctx.moveTo(x, y - p.radius * 3); ctx.lineTo(x, y + p.radius * 3); ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      frame = requestAnimationFrame(draw);
    };
    resize();
    const observer = new ResizeObserver(resize); observer.observe(element);
    frame = requestAnimationFrame(draw);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [color]);
  return <canvas ref={canvas} aria-hidden="true" data-testid="twinkling-stars" className="absolute inset-0 h-full w-full" />;
}