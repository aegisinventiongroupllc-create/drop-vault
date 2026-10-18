import { useEffect, useRef, useState } from "react";
import HexColorWheel from "@/components/HexColorWheel";
import MiniGlobe from "@/components/MiniGlobe";
import { Button } from "@/components/ui/button";
import { getFogIntensity, setFogIntensity } from "@/lib/vipFog";
import { setVipGlow, useVipGlow } from "@/components/VipBackdrop";
import { DEFAULT_STAR_STYLE, STAR_STYLES, THEME_PARTS, activeTheme, loadTheme, previewTheme, saveTheme, saveThemeToAccount, type StarStyle, type ThemeKey, type UserTheme } from "@/lib/userTheme";
import GalaxyReel from "@/components/GalaxyReel";
import SkyGalleryPicker from "@/components/SkyGalleryPicker";
import deepFieldImg from "@/assets/brb/stars-deep-field.jpg";
import milkyWayImg from "@/assets/brb/stars-milky-way.jpg";
import clusterImg from "@/assets/brb/stars-cluster.jpg";

const STAR_THUMBS: Record<"deepfield" | "milkyway" | "cluster", string> = {
  deepfield: deepFieldImg,
  milkyway: milkyWayImg,
  cluster: clusterImg,
};

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
    const h = () => setTheme(activeTheme());
    window.addEventListener("dtt-theme", h);
    return () => window.removeEventListener("dtt-theme", h);
  }, []);
  // Save to the account shortly after the last change (color wheel drags fire fast).
  const persist = (t: UserTheme) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => void saveThemeToAccount(t), 600); };

  // Galaxy changes stay a live example until the person saves or cancels.
  const savedBeforePreview = useRef<UserTheme | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const set = (key: ThemeKey, hex: string) => {
    const next = { ...theme, [key]: hex };
    setTheme(next);
    if (key === "galaxy") {
      if (savedBeforePreview.current === null) savedBeforePreview.current = loadTheme();
      setPreviewing(true);
      previewTheme(next);
      return;
    }
    saveTheme(next);
    persist(next);
  };
  const commitPreview = () => {
    const next = { ...theme };
    savedBeforePreview.current = null;
    setPreviewing(false);
    saveTheme(next);
    persist(next);
  };
  const cancelPreview = () => {
    const saved = savedBeforePreview.current ?? {};
    savedBeforePreview.current = null;
    setPreviewing(false);
    setTheme(saved);
    saveTheme(saved);
  };
  const reset = () => {
    savedBeforePreview.current = null;
    setPreviewing(false);
    setTheme({});
    saveTheme({});
    persist({});
  };
  const setNeon = (globeNeon: boolean) => {
    const next = { ...theme, globeNeon };
    setTheme(next); saveTheme(next); persist(next);
  };
  const setBorderNeon = (globeBorderNeon: boolean) => {
    const next = { ...theme, globeBorderNeon };
    setTheme(next); saveTheme(next); persist(next);
  };
  const setStarStyle = (starStyle: StarStyle) => {
    const next = { ...theme, starStyle };
    setTheme(next); saveTheme(next); persist(next);
  };

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
              {p.key === "galaxy" && (
                <div data-testid="galaxy-preview" className="relative mt-3 h-40 w-full overflow-hidden rounded-md border border-border bg-background">
                  <GalaxyReel />
                  <div className="absolute inset-0 flex items-center justify-center"><MiniGlobe size={96} lights speed={0.25} backdrop={false} /></div>
                  <span className="absolute left-2 top-2 rounded bg-background/70 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-foreground">{previewing ? "Example — not saved" : "Your galaxy"}</span>
                </div>
              )}
            </div>
          ))}
          {previewing && (
            <div className="space-y-2 rounded-md border border-primary/40 bg-primary/10 p-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Example only — nothing saved yet. Watch the star backdrop behind this box.</p>
              <div className="flex gap-2">
                <Button type="button" onClick={commitPreview} className="flex-1 text-xs font-black uppercase tracking-widest">Save galaxy color</Button>
                <Button variant="outline" type="button" onClick={cancelPreview} className="flex-1 text-xs font-black uppercase tracking-widest text-muted-foreground">Keep previous</Button>
              </div>
            </div>
          )}
          <div>
            <span className="text-xs font-bold text-foreground">Star backdrop style</span>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {STAR_STYLES.filter((s) => s.id === "living" || s.id === "deepfield" || s.id === "milkyway" || s.id === "cluster").map((s) => {
                const active = (theme.starStyle ?? DEFAULT_STAR_STYLE) === s.id;
                return (
                  <button key={s.id} type="button" aria-pressed={active} onClick={() => setStarStyle(s.id)}
                    className={`overflow-hidden rounded-md border-2 text-left ${active ? "border-primary" : "border-border"}`}>
                    {s.id === "living" ? (
                      <div className="flex h-10 w-full items-center justify-center bg-[#050510] text-[10px] font-bold tracking-widest text-muted-foreground">✦ ✧ ✦</div>
                    ) : (
                      <img src={STAR_THUMBS[s.id as keyof typeof STAR_THUMBS]} alt="" className="h-10 w-full object-cover" loading="lazy" />
                    )}
                    <span className="block px-2 py-1 text-[10px] font-black uppercase tracking-widest text-foreground">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-center"><MiniGlobe size={140} lights speed={0.25} /></div>
          <SkyGalleryPicker />
          <button type="button" onClick={() => window.dispatchEvent(new Event("dtt-brb-preview"))} className="w-full rounded-md border border-border p-2 text-xs font-black uppercase tracking-widest text-foreground">Preview be right back screen</button>
          <label className="flex items-center justify-between gap-3 rounded-md border border-border p-2 text-xs font-bold text-foreground">
            <span>Multicolor neon globe sparkles</span>
            <input type="checkbox" aria-label="Multicolor neon globe sparkles" checked={theme.globeNeon === true} onChange={(e) => setNeon(e.target.checked)} className="h-4 w-4 shrink-0 accent-primary" />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-md border border-border p-2 text-xs font-bold text-foreground">
            <span>Multicolor country outlines</span>
            <input type="checkbox" aria-label="Multicolor country outlines" checked={theme.globeBorderNeon === true} onChange={(e) => setBorderNeon(e.target.checked)} className="h-4 w-4 shrink-0 accent-primary" />
          </label>
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
