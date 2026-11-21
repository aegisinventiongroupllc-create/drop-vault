import { useEffect, useRef, useState } from "react";
import EntryPassGlobe, { ENTRY_GLOBE } from "@/components/EntryPassGlobe";
import { supabase } from "@/integrations/supabase/client";

import GalaxyReel from "@/components/GalaxyReel";
import MiniGlobe from "@/components/MiniGlobe";
import IdleCountdown from "@/components/IdleCountdown";
import { QRCodeSVG } from "qrcode.react";
import { createQrSwipe, QR_SWIPE } from "@/lib/qrSwipe";
import { creatorShareUrl } from "@/lib/creatorSharing";
import { loadTheme } from "@/lib/userTheme";

const IDLE_MS = 60_000;

/**
 * "Be right back" screen: after a minute with no mouse, keys or touch, a
 * full-screen spinning globe fades in like a phone lock screen (no lock).
 * Two clicks/taps return to the app; Escape remains keyboard accessible.
 *
 * Visitors who haven't signed up yet always see the original DTT galaxy
 * (Star cluster) and entry-pass pink globe. Signed-in members see the globe
 * and idle sky they designed, which follow their account to every device.
 */
const BeRightBack = () => {
  const [away, setAway] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("brb"));
  const [signedIn, setSignedIn] = useState(false);
  const timer = useRef<number>();
  const hold = useRef(0);
  const lastTap = useRef<number | null>(null);
  const [creatorUrl, setCreatorUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const qrTone = (signedIn && loadTheme().globe) || ENTRY_GLOBE.tone;

  // Creators only: look up their own share link for the corner-swipe QR.
  useEffect(() => {
    if (!signedIn) { setCreatorUrl(null); return; }
    let active = true;
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const id = session?.user.id;
      if (!id) return;
      const { data: pref } = await supabase.from("account_preferences").select("account_type").eq("user_id", id).maybeSingle();
      if (pref?.account_type !== "creator") return;
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", id).maybeSingle();
      if (active) setCreatorUrl(creatorShareUrl(profile?.display_name));
    })();
    return () => { active = false; };
  }, [signedIn]);

  // Swipe up-down twice in a bottom corner: globe becomes the QR code for 10 seconds.
  useEffect(() => {
    if (!away || !creatorUrl) return;
    const swipe = createQrSwipe();
    let hide: number | undefined;
    const start = (e: TouchEvent) => { const t = e.touches[0]; swipe.start(t.clientX, t.clientY, window.innerWidth, window.innerHeight, Date.now()); };
    const move = (e: TouchEvent) => {
      if (!swipe.move(e.touches[0].clientY, Date.now())) return;
      lastTap.current = null;
      setShowQr(true);
      window.clearTimeout(hide);
      hide = window.setTimeout(() => setShowQr(false), QR_SWIPE.showMs);
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    return () => { window.removeEventListener("touchstart", start); window.removeEventListener("touchmove", move); window.clearTimeout(hide); setShowQr(false); };
  }, [away, creatorUrl]);

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
    const back = (event: Event) => {
      if (Date.now() < hold.current) return;
      if (event.target instanceof Element && event.target.closest("[data-idle-interactive]")) {
        return;
      }
      if (away) {
        if (event instanceof KeyboardEvent && event.key === "Escape") {
          lastTap.current = null;
        } else if (event.type === "click") {
          const now = Date.now();
          if (lastTap.current === null || now - lastTap.current > 700) { lastTap.current = now; return; }
          lastTap.current = null;
        } else return;
      }
      setAway(false);
      reset();
    };
    const events: (keyof WindowEventMap)[] = ["mousemove", "click", "keydown", "touchstart", "scroll", "wheel"];
    events.forEach((e) => window.addEventListener(e, back, { passive: true }));
    const preview = () => { hold.current = Date.now() + 1500; lastTap.current = null; setAway(true); };
    window.addEventListener("dtt-brb-preview", preview);
    reset();
    return () => {
      window.removeEventListener("dtt-brb-preview", preview);
      window.clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, back));
    };
  }, [away]);

  if (!away) return null;
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 overflow-hidden bg-background animate-in fade-in duration-700" role="status" aria-label="Be right back">
      {signedIn
        ? <GalaxyReel scope="brb" seconds={240} />
        : <GalaxyReel scope="brb" seconds={240} styleOverride="cluster" toneOverride={ENTRY_GLOBE.tone} />}
      <div className="absolute inset-0 bg-background/25" aria-hidden />
      <div className="relative flex flex-col items-center gap-6 p-6">
        {showQr && creatorUrl ? (
          <div className="relative flex h-[220px] w-[220px] items-center justify-center rounded-full animate-in zoom-in-75 fade-in duration-500" data-testid="brb-creator-qr"
            style={{ background: `radial-gradient(circle, color-mix(in srgb, ${qrTone} 45%, transparent), transparent 70%)` }}>
            <div className="rounded-2xl p-3" style={{ background: `color-mix(in srgb, ${qrTone} 12%, white)`, boxShadow: `0 0 28px ${qrTone}` }}>
              <QRCodeSVG value={creatorUrl} size={168} level="H" marginSize={2} bgColor="transparent"
                fgColor={`color-mix(in srgb, ${qrTone} 35%, black)`} aria-label="My DTT creator QR code" />
            </div>
          </div>
        ) : signedIn ? (
          <div className="relative inline-flex select-none globe-breathe" data-testid="personal-brb-globe">
            <MiniGlobe size={220} speed={0.15} lights backdrop={false} cameraDistance={3.8} />
            <p translate="no" className="notranslate absolute inset-0 flex items-center justify-center font-display text-3xl font-bold tracking-[0.35em] text-primary">DTT</p>
          </div>
        ) : <EntryPassGlobe size={220} solid />}
        <IdleCountdown />
        <p className="text-sm font-black uppercase tracking-[0.4em] text-foreground/80 animate-pulse">Be right back</p>
      </div>
    </div>
  );
};

export default BeRightBack;
