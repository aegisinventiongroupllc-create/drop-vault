import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import HexColorWheel from "@/components/HexColorWheel";
import TwinklingStars from "@/components/TwinklingStars";
import { loadTheme, saveTheme, saveThemeToAccount } from "@/lib/userTheme";
import { toast } from "@/hooks/use-toast";

export default function DashboardStarsPicker() {
  const [enabled, setEnabled] = useState(loadTheme().dashboardStars === true);
  const [color, setColor] = useState(loadTheme().dashboardStarTone ?? "#ff0080");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const update = () => { if (!dirty) { const theme = loadTheme(); setEnabled(theme.dashboardStars === true); setColor(theme.dashboardStarTone ?? "#ff0080"); } };
    window.addEventListener("dtt-theme", update);
    return () => window.removeEventListener("dtt-theme", update);
  }, [dirty]);
  const save = async () => {
    setSaving(true);
    const next = { ...loadTheme(), dashboardStars: enabled, dashboardStarTone: color };
    saveTheme(next);
    const synced = await saveThemeToAccount(next);
    setDirty(false); setSaving(false);
    toast({ title: synced ? "Dashboard stars saved" : "Stars saved on this device", description: synced ? undefined : "Account sync is unavailable. Your choice is kept on this device." });
  };
  return <section className="space-y-3" aria-label="Twinkling dashboard stars">
    <div className="relative h-44 overflow-hidden rounded-md border border-border bg-background"><TwinklingStars color={color} /></div>
    <label className="flex items-center justify-between gap-3 text-xs font-bold">
      <span>Twinkling stars behind my dashboard</span>
      <input type="checkbox" aria-label="Twinkling stars behind my dashboard" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); setDirty(true); }} className="h-4 w-4 shrink-0 accent-primary" />
    </label>
    <HexColorWheel color={color} label="Dashboard star color" onChange={(hex) => { setColor(hex); setDirty(true); }} />
    <Button type="button" className="w-full text-xs" disabled={!dirty || saving} onClick={() => void save()}>{saving ? "Saving stars…" : "Save dashboard stars"}</Button>
  </section>;
}