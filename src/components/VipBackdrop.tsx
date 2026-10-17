import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getFogIntensity } from "@/lib/vipFog";

const KEY = "dtt_vip_glow";
export const getVipGlow = () => { try { return localStorage.getItem(KEY) !== "0"; } catch { return true; } };
export const setVipGlow = (on: boolean) => {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* ok */ }
  window.dispatchEvent(new Event("dtt-vip-glow"));
};
export function useVipGlow() {
  const [on, setOn] = useState(getVipGlow);
  useEffect(() => {
    const h = () => {
      setOn(getVipGlow());
      document.documentElement.style.setProperty("--vip-fog-intensity", String(getFogIntensity() / 100));
    };
    h();
    window.addEventListener("dtt-vip-glow", h);
    return () => window.removeEventListener("dtt-vip-glow", h);
  }, []);
  return on;
}

/** Neon "VIP room" lights and drifting fog, tinted by the person's highlight color. */
export default function VipBackdrop() {
  const on = useVipGlow();
  if (!on) return null;
  return (
    <div aria-hidden="true" className="vip-backdrop pointer-events-none absolute inset-0 overflow-hidden">
      <span className="vip-neon vip-neon-a" />
      <span className="vip-neon vip-neon-b" />
      <span className="vip-fog vip-fog-a" />
      <span className="vip-fog vip-fog-b" />
    </div>
  );
}

/** Full-screen "fog machine": smoke puffs drifting across the whole dashboard. */
export function VipFogMachine() {
  const on = useVipGlow();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (!on || !signedIn) return null;
  return (
    <div aria-hidden="true" className="vip-fog-machine pointer-events-none fixed inset-0 overflow-hidden">
      {Array.from({ length: 8 }, (_, i) => <span key={i} className={`vip-smoke vip-smoke-${i}`} />)}
    </div>
  );
}
