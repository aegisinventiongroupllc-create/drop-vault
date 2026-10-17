import { useEffect, useRef, useState } from "react";
import MiniGlobe from "@/components/MiniGlobe";

import space1 from "@/assets/brb/space-1.jpg";
import space2 from "@/assets/brb/space-2.jpg";
import space3 from "@/assets/brb/space-3.jpg";
import space4 from "@/assets/brb/space-4.jpg";

const IDLE_MS = 60_000;
const SLIDES = [space1, space2, space3, space4];
const SLIDE_SECONDS = 12;

/**
 * "Be right back" screen: after a minute with no mouse, keys or touch, a
 * full-screen spinning globe fades in like a phone lock screen (no lock).
 * Any activity brings the app straight back.
 */
const BeRightBack = () => {
  const [away, setAway] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("brb"));
  const timer = useRef<number>();

  useEffect(() => {
    const reset = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setAway(true), IDLE_MS);
    };
    const back = () => {
      setAway(false);
      reset();
    };
    const events: (keyof WindowEventMap)[] = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"];
    events.forEach((e) => window.addEventListener(e, back, { passive: true }));
    reset();
    return () => {
      window.clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, back));
    };
  }, []);

  if (!away) return null;
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 overflow-hidden bg-background animate-in fade-in duration-700" role="status" aria-label="Be right back">
      {SLIDES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden
          className="brb-slide absolute inset-0 h-full w-full object-cover"
          style={{ animationDelay: `${i * SLIDE_SECONDS - SLIDES.length * SLIDE_SECONDS}s`, animationDuration: `${SLIDES.length * SLIDE_SECONDS}s` }}
        />
      ))}
      <div className="absolute inset-0 bg-background/30" aria-hidden />
      <div className="relative flex flex-col items-center gap-6">
        <MiniGlobe size={280} lights speed={0.35} />
        <p className="text-sm font-black uppercase tracking-[0.4em] text-foreground/80 animate-pulse">Be right back</p>
      </div>
    </div>
  );
};

export default BeRightBack;
