export const DEFAULT_FOG_INTENSITY = 50;
export function normalizeFogIntensity(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : DEFAULT_FOG_INTENSITY;
}
const KEY = "dtt_vip_fog_intensity";
export function getFogIntensity(): number {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === null ? DEFAULT_FOG_INTENSITY : normalizeFogIntensity(Number(saved));
  } catch { return DEFAULT_FOG_INTENSITY; }
}
export function setFogIntensity(value: number) {
  const intensity = normalizeFogIntensity(value);
  try { localStorage.setItem(KEY, String(intensity)); } catch { /* display-only */ }
  document.documentElement.style.setProperty("--vip-fog-intensity", String(intensity / 100));
  window.dispatchEvent(new Event("dtt-vip-glow"));
}