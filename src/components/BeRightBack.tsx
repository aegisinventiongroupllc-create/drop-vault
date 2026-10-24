import { useEffect, useRef, useState } from "react";
import MiniGlobe from "@/components/MiniGlobe";
import { supabase } from "@/integrations/supabase/client";

import GalaxyReel from "@/components/GalaxyReel";

const IDLE_MS = 60_000;

/**
 * "Be right back" screen: after a minute with no mouse, keys or touch, a
 * full-screen spinning globe fades in like a phone lock screen (no lock).
 * Any activity brings the app straight back.
 *
 * Visitors who haven't signed up yet always see the original DTT galaxy
 * (Star cluster, untinted). Personal skies only appear once someone is
 * signed in and has chosen their own.
 */
const BeRightBack = () => {
  const [away, setAway] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("brb"));
  const [signedIn, setSignedIn] = useState(false);
  const timer = useRef<number>();
  const hold = useRef(0);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const reset = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setAway(true), IDLE_MS);
    };
    const back = () => {
      if (Date.now() < hold.current) return;
      setAway(false);
      reset();
    };
    const events: (keyof WindowEventMap)[] = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"];
    events.forEach((e) => window.addEventListener(e, back, { passive: true }));
    const preview = () => { hold.current = Date.now() + 1500; setAway(true); };
    window.addEventListener("dtt-brb-preview", preview);
    reset();
    return () => {
      window.removeEventListener("dtt-brb-preview", preview);
      window.clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, back));
    };
  }, []);

  if (!away) return null;
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 overflow-hidden bg-background animate-in fade-in duration-700" role="status" aria-label="Be right back">
      {signedIn
        ? <GalaxyReel scope="brb" seconds={170} />
        : <GalaxyReel scope="brb" seconds={170} styleOverride="cluster" toneOverride="" />}
      <div className={`absolute inset-0 ${signedIn ? "bg-background/30" : "bg-background/55"}`} aria-hidden />
      <div className="relative flex flex-col items-center gap-6">
        <MiniGlobe size={signedIn ? 280 : 320} lights speed={0.2} backdrop={false} />
        <p className="text-sm font-black uppercase tracking-[0.4em] text-foreground/80 animate-pulse">Be right back</p>
      </div>
    </div>
  );
};

export default BeRightBack;
