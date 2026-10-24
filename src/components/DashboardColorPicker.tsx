import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import HexColorWheel from "@/components/HexColorWheel";
import MiniGlobe from "@/components/MiniGlobe";
import { Button } from "@/components/ui/button";
import { getFogIntensity, setFogIntensity } from "@/lib/vipFog";
import { setVipGlow, useVipGlow } from "@/components/VipBackdrop";
import { DEFAULT_STAR_STYLE, STAR_STYLES, THEME_PARTS, activeTheme, loadTheme, previewTheme, saveTheme, saveThemeToAccount, type StarStyle, type ThemeKey, type UserTheme } from "@/lib/userTheme";
import GalaxyReel from "@/components/GalaxyReel";
import SkyGalleryPicker from "@/components/SkyGalleryPicker";
import { SKY_BACKDROPS } from "@/lib/skyBackdrops";
import { toast } from "@/hooks/use-toast";
import FoldBox from "@/components/FoldBox";
import DashboardStarsPicker from "@/components/DashboardStarsPicker";

const SWATCHES = ["#ff0080", "#3b82f6", "#c0c0c0", "#fbbf24", "#22c55e", "#a855f7", "#ef4444", "#14b8a6", "#000000", "#0f0f0f", "#1e293b", "#ffffff"];

/** Lets each creator or customer recolor their own dashboard. */
export type DashboardColorPickerHandle = { saveGalaxy: () => Promise<boolean> };

const DashboardColorPicker = forwardRef<DashboardColorPickerHandle>((_, ref) => {
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
  const commitPreview = async () => {
    if (!previewing) return false;
    const next = { ...theme };
    savedBeforePreview.current = null;
    setPreviewing(false);
    saveTheme(next);
    window.clearTimeout(timer.current);
    const synced = await saveThemeToAccount(next);
    toast({ title: synced ? "Galaxy saved" : "Galaxy saved on this device", description: synced ? undefined : "Account sync is unavailable. Your color is kept on this device." });
    return true;
  };
  useImperativeHandle(ref, () => ({ saveGalaxy: commitPreview }));
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
    setTheme(next);
    if (savedBeforePreview.current === null) savedBeforePreview.current = loadTheme();
    setPreviewing(true);
    previewTheme(next);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/50 p-3 text-left sm:p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Your dashboard colors</p>
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-[10px] font-bold tracking-widest text-primary">
          {open ? "HIDE COLORS" : "SHOW COLORS"}
        </button>
      </div>
      <Button variant="outline" type="button" onClick={reset} className="w-full border-primary/60 text-xs font-black uppercase tracking-widest text-primary">
        Back to original DTT colors
      </Button>
      {open && (
        <>
          {THEME_PARTS.map((p) => (
            <FoldBox key={p.key} title={p.label}>
              {p.key === "galaxy" && (
                <div data-testid="galaxy-preview" className="sticky top-0 z-10 relative mb-3 h-40 w-full overflow-hidden rounded-md border border-border bg-background">
                  <GalaxyReel />
                  <div className="absolute inset-0 flex items-center justify-center"><MiniGlobe size={96} lights speed={0.25} backdrop={false} /></div>
                  <span className="absolute left-2 top-2 rounded bg-background/70 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-foreground">{previewing ? "Example — not saved" : "Your galaxy"}</span>
                </div>
              )}
              {p.key === "galaxy" && <div className="mb-3"><HexColorWheel color={theme.galaxy ?? "#ffffff"} label="Color wheel for Galaxy & star color" onChange={(hex) => set("galaxy", hex)} /></div>}
              <div className="mb-1.5 flex items-center justify-end">
                {p.key !== "galaxy" && (
                  <button type="button" aria-label={`Open color wheel for ${p.label}`} onClick={() => setWheelFor(wheelFor === p.key ? null : p.key)}
                    className="h-7 w-10 overflow-hidden rounded border border-border">
                    <svg viewBox="0 0 10 10" className="h-full w-full"><rect width="10" height="10" fill={theme[p.key] ?? "#ff0080"} /></svg>
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2.5 p-1">
                {SWATCHES.map((hex) => {
                  const on = theme[p.key] === hex;
                  return (
                  <button key={hex} type="button" aria-label={`Use ${hex}`} aria-pressed={on} onClick={() => set(p.key, hex)}
                    className={`h-8 w-8 rounded-full p-0.5 transition-transform duration-200 hover:scale-110 active:scale-95 ${on ? "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background" : "ring-1 ring-border/60"}`}>
                    <svg viewBox="0 0 20 20" className="h-full w-full">
                      <defs>
                        <radialGradient id={`g-${p.key}-${hex.slice(1)}`} cx="35%" cy="30%" r="75%">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
                          <stop offset="35%" stopColor={hex} stopOpacity="1" />
                          <stop offset="100%" stopColor={hex} stopOpacity="0.75" />
                        </radialGradient>
                      </defs>
                      <circle cx="10" cy="10" r="10" fill={`url(#g-${p.key}-${hex.slice(1)})`} />
                    </svg>
                  </button>
                  );
                })}
              </div>
              {p.key !== "galaxy" && wheelFor === p.key && <div className="mt-3"><HexColorWheel color={theme[p.key] ?? "#ff0080"} label={`Color wheel for ${p.label}`} onChange={(hex) => set(p.key, hex)} /></div>}
              {p.key === "galaxy" && previewing && (
                <div className="mt-3 space-y-2 rounded-md border border-primary/40 bg-primary/10 p-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Example only — nothing saved yet.</p>
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => void commitPreview()} className="flex-1 whitespace-normal text-xs font-black uppercase tracking-widest">Save galaxy color</Button>
                    <Button variant="outline" type="button" onClick={cancelPreview} className="flex-1 text-xs font-black uppercase tracking-widest text-muted-foreground">Keep previous</Button>
                  </div>
                </div>
              )}
            </FoldBox>
          ))}
          <FoldBox title="Star backdrop style">
            <div className="grid grid-cols-2 gap-1.5">
              {STAR_STYLES.map((s) => {
                const active = (theme.starStyle ?? DEFAULT_STAR_STYLE) === s.id;
                return (
                  <button key={s.id} type="button" aria-pressed={active} onClick={() => setStarStyle(s.id)}
                    className={`overflow-hidden rounded-md border-2 text-left ${active ? "border-primary" : "border-border"}`}>
                    {s.id === "living" ? (
                      <div className="flex h-10 w-full items-center justify-center bg-background text-[10px] font-bold tracking-widest text-muted-foreground">✦ ✧ ✦</div>
                    ) : (
                      <img src={SKY_BACKDROPS[s.id]} alt="" className="h-10 w-full object-cover" loading="lazy" />
                    )}
                    <span className="block px-2 py-1 text-[10px] font-black uppercase tracking-widest text-foreground">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </FoldBox>
          <FoldBox title="Globe preview"><div data-testid="globe-preview" className="relative h-48 w-full overflow-hidden rounded-md border border-border bg-background"><GalaxyReel /><div className="absolute inset-0 flex items-center justify-center"><MiniGlobe size={140} lights speed={0.25} backdrop={false} /></div><span className="absolute left-2 top-2 rounded bg-background/70 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-foreground">{previewing ? "Example — not saved" : "Your galaxy"}</span></div>
            {previewing && <div className="mt-2 flex gap-2"><Button type="button" onClick={() => void commitPreview()} className="flex-1 whitespace-normal text-xs font-black uppercase tracking-widest">Save galaxy</Button><Button variant="outline" type="button" onClick={cancelPreview} className="flex-1 text-xs font-black uppercase tracking-widest text-muted-foreground">Keep previous</Button></div>}</FoldBox>
          <FoldBox title="Be Right Back sky gallery"><SkyGalleryPicker /></FoldBox>
          <FoldBox title="Twinkling dashboard stars"><DashboardStarsPicker /></FoldBox>
          <button type="button" onClick={() => window.dispatchEvent(new Event("dtt-brb-preview"))} className="dtt-panel w-full p-3 text-xs font-black uppercase tracking-widest text-primary">Preview be right back screen</button>
          <label className="dtt-panel flex items-center justify-between gap-3 p-3 text-xs font-bold text-foreground">
            <span>Multicolor neon globe sparkles</span>
            <input type="checkbox" aria-label="Multicolor neon globe sparkles" checked={theme.globeNeon === true} onChange={(e) => setNeon(e.target.checked)} className="h-4 w-4 shrink-0 accent-primary" />
          </label>
          <label className="dtt-panel flex items-center justify-between gap-3 p-3 text-xs font-bold text-foreground">
            <span>Multicolor country outlines</span>
            <input type="checkbox" aria-label="Multicolor country outlines" checked={theme.globeBorderNeon === true} onChange={(e) => setBorderNeon(e.target.checked)} className="h-4 w-4 shrink-0 accent-primary" />
          </label>
          <label className="dtt-panel flex items-center justify-between gap-3 p-3 text-xs font-bold text-foreground">
            <span>VIP room glow — neon lights and fog in your highlight color</span>
            <input type="checkbox" checked={vip} onChange={(e) => setVipGlow(e.target.checked)} className="h-4 w-4 accent-primary" />
          </label>
          <label className="dtt-panel block space-y-2 p-3 text-xs font-bold text-foreground">
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
});

export default DashboardColorPicker;
