import { useEffect, useRef, useState } from "react";
import HexColorWheel from "@/components/HexColorWheel";
import { Button } from "@/components/ui/button";
import { getFogIntensity, setFogIntensity } from "@/lib/vipFog";
import { setVipGlow, useVipGlow } from "@/components/VipBackdrop";
import { THEME_PARTS, loadTheme, saveTheme, saveThemeToAccount, type ThemeKey, type UserTheme } from "@/lib/userTheme";

const SWATCHES = ["#ff0080", "#3b82f6", "#c0c0c0", "#fbbf24", "#22c55e", "#a855f7", "#ef4444", "#14b8a6", "#000000", "#0f0f0f", "#1e293b", "#ffffff"];

/** Lets each creator or customer recolor their own dashboard. */
const DashboardColorPicker = () => {
  const [theme, setTheme] = useState<UserTheme>(loadTheme);
  const [open, setOpen] = useState(false);
  const [wheelFor, setWheelFor] = useState<ThemeKey | null>("primary");
  const vip = useVipGlow();
  const [fog, setFog] = useState(getFogIntensity);
  const timer = useRef<number>();
  useEffect(() => {
    const h = () => setTheme(loadTheme());
    window.addEventListener("dtt-theme", h);
    return () => window.removeEventListener("dtt-theme", h);
  }, []);
  // Save to the account shortly after the last change (color wheel drags fire fast).
  const persist = (t: UserTheme) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => void saveThemeToAccount(t), 600); };

  const set = (key: ThemeKey, hex: string) => {
    const next = { ...theme, [key]: hex };
    setTheme(next);
    saveTheme(next);
    persist(next);
  };
  const reset = () => { setTheme({}); saveTheme({}); persist({}); };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/50 p-3 text-left sm:p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Your dashboard colors</p>
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-[10px] font-bold tracking-widest text-primary">
          {open ? "HIDE COLORS" : "SHOW COLORS"}
        </button>
      </div>
      {open && (
        <>
          {THEME_PARTS.map((p) => (
            <div key={p.key}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">{p.label}</span>
                <button type="button" aria-label={`Open color wheel for ${p.label}`} onClick={() => setWheelFor(wheelFor === p.key ? null : p.key)}
                  className="h-7 w-10 overflow-hidden rounded border border-border">
                  <svg viewBox="0 0 10 10" className="h-full w-full"><rect width="10" height="10" fill={theme[p.key] ?? "#ff0080"} /></svg>
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SWATCHES.map((hex) => (
                  <button key={hex} type="button" aria-label={`Use ${hex}`} onClick={() => set(p.key, hex)}
                    className={`h-6 w-6 rounded-full border-2 ${theme[p.key] === hex ? "border-foreground" : "border-border"}`}>
                    <svg viewBox="0 0 10 10" className="h-full w-full"><circle cx="5" cy="5" r="5" fill={hex} /></svg>
                  </button>
                ))}
              </div>
              {wheelFor === p.key && <div className="mt-3"><HexColorWheel color={theme[p.key] ?? "#ff0080"} label={`Color wheel for ${p.label}`} onChange={(hex) => set(p.key, hex)} /></div>}
            </div>
          ))}
          <label className="flex items-center justify-between rounded-md border border-border p-2 text-xs font-bold text-foreground">
            <span>VIP room glow — neon lights and fog in your highlight color</span>
            <input type="checkbox" checked={vip} onChange={(e) => setVipGlow(e.target.checked)} className="h-4 w-4 accent-primary" />
          </label>
          <label className="block space-y-2 text-xs font-bold text-foreground">
            <span className="flex justify-between"><span>Fog intensity</span><span>{fog}%</span></span>
            <input type="range" aria-label="Fog intensity" min={0} max={100} step={1} value={fog} disabled={!vip}
              onChange={(e) => { const value = Number(e.target.value); setFog(value); setFogIntensity(value); }}
              className="w-full accent-primary disabled:opacity-40" />
            <span className="flex justify-between text-muted-foreground"><span>Clear</span><span>Heavy fog</span></span>
          </label>
          <Button variant="outline" type="button" onClick={reset} className="w-full text-xs font-bold tracking-widest text-muted-foreground">
            RESET TO DTT COLORS
          </Button>
        </>
      )}
    </div>
  );
};

export default DashboardColorPicker;
