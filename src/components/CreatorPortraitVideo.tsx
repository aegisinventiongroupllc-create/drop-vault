import { useEffect, useRef } from "react";

/** Muted portrait motion only while visible; reduced motion retains a still frame. */
export default function CreatorPortraitVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => {
      if (visible && !motion.matches && !document.hidden) void video.play().catch(() => {});
      else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(video);
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    video.addEventListener("loadeddata", update);
    return () => {
      observer.disconnect(); video.pause();
      motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      video.removeEventListener("loadeddata", update);
    };
  }, [src]);
  return <video ref={ref} src={src} muted playsInline loop preload="metadata" className="h-full w-full object-cover" aria-label="Creator smile portrait" onTimeUpdate={() => {
    const video = ref.current;
    if (video && video.currentTime >= 5) video.currentTime = 0;
  }} />;
}