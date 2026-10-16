import { useEffect, useState } from "react";

const KEY = "dtt_vip_glow";
export const getVipGlow = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };
export const setVipGlow = (on: boolean) => {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* ok */ }
  window.dispatchEvent(new Event("dtt-vip-glow"));
};
export function useVipGlow() {
  const [on, setOn] = useState(getVipGlow);
  useEffect(() => {
    const h = () => setOn(getVipGlow());
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
