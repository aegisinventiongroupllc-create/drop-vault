import { useState } from "react";
import { THEME_PARTS, loadTheme, saveTheme, type ThemeKey, type UserTheme } from "@/lib/userTheme";

const SWATCHES = ["#ff0080", "#3b82f6", "#c0c0c0", "#fbbf24", "#22c55e", "#a855f7", "#ef4444", "#14b8a6", "#000000", "#0f0f0f", "#1e293b", "#ffffff"];

/** Lets each creator or customer recolor their own dashboard. */
const DashboardColorPicker = () => {
  const [theme, setTheme] = useState<UserTheme>(loadTheme);
  const [open, setOpen] = useState(false);

  const set = (key: ThemeKey, hex: string) => {
    const next = { ...theme, [key]: hex };
    setTheme(next);
    saveTheme(next);
  };
  const reset = () => { setTheme({}); saveTheme({}); };

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
                <input type="color" aria-label={`Pick ${p.label} color`} value={theme[p.key] ?? "#ff0080"}
                  onChange={(e) => set(p.key, e.target.value)} className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SWATCHES.map((hex) => (
                  <button key={hex} type="button" aria-label={`Use ${hex}`} onClick={() => set(p.key, hex)}
                    className={`h-6 w-6 rounded-full border-2 ${theme[p.key] === hex ? "border-foreground" : "border-border"}`}>
                    <svg viewBox="0 0 10 10" className="h-full w-full"><circle cx="5" cy="5" r="5" fill={hex} /></svg>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button type="button" onClick={reset} className="w-full rounded-md border border-border py-2 text-xs font-bold tracking-widest text-muted-foreground">
            RESET TO DTT COLORS
          </button>
        </>
      )}
    </div>
  );
};

export default DashboardColorPicker;
