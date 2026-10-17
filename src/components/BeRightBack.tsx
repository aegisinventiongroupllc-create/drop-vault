import { useEffect, useRef, useState } from "react";
import MiniGlobe from "@/components/MiniGlobe";

const IDLE_MS = 60_000;

/**
 * "Be right back" screen: after a minute with no mouse, keys or touch, a
 * full-screen spinning globe fades in like a phone lock screen (no lock).
 * Any activity brings the app straight back.
 */
const BeRightBack = () => {
  const [away, setAway] = useState(false);
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
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-sm animate-in fade-in duration-700" role="status" aria-label="Be right back">
      <MiniGlobe size={280} lights speed={0.35} />
      <p className="text-sm font-black uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Be right back</p>
    </div>
  );
};

export default BeRightBack;
