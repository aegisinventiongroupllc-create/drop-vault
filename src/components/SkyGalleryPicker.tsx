import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import HexColorWheel from "@/components/HexColorWheel";
import GalaxyReel from "@/components/GalaxyReel";
import { SKY_BACKDROPS } from "@/lib/skyBackdrops";
import { loadTheme, resolveIdleSky, saveTheme, saveThemeToAccount, STAR_STYLES } from "@/lib/userTheme";

export default function SkyGalleryPicker() {
  const saved = loadTheme();
  const idleSky = resolveIdleSky(saved);
  const [style, setStyle] = useState(idleSky.style);
  const [tone, setTone] = useState(idleSky.tone ?? "#ffffff");
  const [tinted, setTinted] = useState(Boolean(idleSky.tone));
  const [dashboard, setDashboard] = useState(saved.dashboardSky === true);
  const [dirty, setDirty] = useState(false);
  const keep = () => {
    const previous = loadTheme();
    const sky = resolveIdleSky(previous);
    setStyle(sky.style);
    setTone(sky.tone ?? "#ffffff");
    setTinted(Boolean(sky.tone));
    setDashboard(previous.dashboardSky === true);
    setDirty(false);
  };
  useEffect(() => {
    const update = () => { if (!dirty) keep(); };
    window.addEventListener("dtt-theme", update);
    return () => window.removeEventListener("dtt-theme", update);
  }, [dirty]);
  const save = () => {
    const next = { ...loadTheme(), brbStyle: style, brbTone: tinted ? tone : undefined, dashboardSky: dashboard };
    saveTheme(next);
    void saveThemeToAccount(next);
    setDirty(false);
  };
  const useMainGalaxy = () => {
    const next = { ...loadTheme() };
    delete next.brbStyle;
    delete next.brbTone;
    saveTheme(next);
    void saveThemeToAccount(next);
    keep();
  };
  return <section className="space-y-3 border-t border-border pt-4" aria-label="Be Right Back sky gallery">
    <h3 className="text-xs font-bold text-foreground">Be Right Back sky gallery</h3>
    <Button variant="outline" type="button" className="w-full text-xs" onClick={useMainGalaxy}>Use my galaxy for Be Right Back</Button>
    <div className="relative h-44 overflow-hidden rounded-md border border-border" data-testid="sky-gallery-preview">
      <GalaxyReel styleOverride={style} toneOverride={tinted ? tone : ""} />
    </div>
    <div className="grid grid-cols-2 gap-2">
      {STAR_STYLES.map((s) => <Button key={s.id} variant="outline" type="button" aria-pressed={style === s.id}
        onClick={() => { setStyle(s.id); setDirty(true); }}
        className={`h-auto min-w-0 flex-col gap-0 overflow-hidden p-0 text-left ${style === s.id ? "border-primary ring-1 ring-primary" : "border-border"}`}>
        {s.id === "living" ? <span className="flex h-14 w-full items-center justify-center bg-background text-muted-foreground">✦ ✧ ✦</span>
          : <img src={SKY_BACKDROPS[s.id]} alt="" className="h-14 w-full object-cover" loading="lazy" />}
        <span className="w-full whitespace-normal px-2 py-2 text-[10px] font-bold uppercase">{s.label}</span>
      </Button>)}
    </div>
    <HexColorWheel color={tone} label="Be Right Back sky color" onChange={(hex) => { setTone(hex); setTinted(true); setDirty(true); }} />
    <Button variant="ghost" type="button" className="w-full text-xs" onClick={() => { setTinted(false); setDirty(true); }}>Original sky colors</Button>
    <label className="flex items-center justify-between gap-3 text-xs font-bold text-foreground">
      <span>Also use this sky behind my dashboard</span>
      <input type="checkbox" aria-label="Also use this sky behind my dashboard" checked={dashboard} onChange={(e) => { setDashboard(e.target.checked); setDirty(true); }} className="h-4 w-4 shrink-0 accent-primary" />
    </label>
    <div className="flex gap-2">
      <Button type="button" disabled={!dirty} className="flex-1 text-xs" onClick={save}>Save sky</Button>
      <Button type="button" variant="outline" disabled={!dirty} className="flex-1 text-xs" onClick={keep}>Keep previous</Button>
    </div>
    <Button variant="outline" type="button" className="w-full whitespace-normal text-xs" onClick={() => window.dispatchEvent(new Event("dtt-brb-preview"))}>Preview saved Be Right Back screen</Button>
  </section>;
}
