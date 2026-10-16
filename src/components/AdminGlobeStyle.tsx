import { useState } from "react";
import { Check } from "lucide-react";
import MiniGlobe from "@/components/MiniGlobe";
import { saveGlobeStyle, useGlobeStyle, type GlobeStyle } from "@/lib/globeStyle";

const LOOKS: { id: GlobeStyle; name: string; blurb: string }[] = [
  {
    id: "brand",
    name: "DTT BRAND",
    blurb: "Dark navy sphere, cyan country borders, faint grid. Straight to the point.",
  },
  {
    id: "earth",
    name: "REAL EARTH",
    blurb: "Satellite photo of the world, with city lights glowing on the night side.",
  },
];

/**
 * Owner's globe wardrobe: flip between the two looks, see both spinning live,
 * and the one you tap becomes what every customer and creator sees.
 */
const AdminGlobeStyle = () => {
  const style = useGlobeStyle();
  const [saving, setSaving] = useState<GlobeStyle | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const choose = async (id: GlobeStyle) => {
    if (id === style || saving) return;
    setSaving(id);
    setNote(null);
    const res = await saveGlobeStyle(id);
    setSaving(null);
    setNote(
      res.ok
        ? { ok: true, text: `Saved. Everyone now sees the ${id === "brand" ? "DTT brand" : "real Earth"} globe.` }
        : {
            ok: false,
            text: "This phone shows it, but it couldn't be saved for everyone yet. Sign in as the owner account, then tap again.",
          }
    );
  };

  return (
    <div className="px-4 space-y-4">
      <div>
        <p className="text-sm font-bold text-foreground">Globe Look</p>
        <p className="text-xs text-muted-foreground">
          Both are live below. Tap one and it becomes the globe on every screen: the entry pass, the feed and the
          full country globe.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {LOOKS.map((look) => {
          const active = style === look.id;
          return (
            <button
              key={look.id}
              onClick={() => choose(look.id)}
              disabled={!!saving}
              className={`rounded-xl border p-3 flex flex-col items-center gap-2 transition-all active:scale-[0.98] ${
                active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className="flex h-[130px] items-center justify-center">
                <MiniGlobe size={128} speed={0.35} lights styleOverride={look.id} />
              </span>
              <span className="flex items-center gap-1.5">
                {active && <Check className="w-3.5 h-3.5 text-primary" />}
                <span className={`text-[11px] font-bold tracking-wider ${active ? "text-primary" : "text-foreground"}`}>
                  {look.name}
                </span>
              </span>
              <span className="text-[10px] text-muted-foreground text-center leading-snug">{look.blurb}</span>
              <span
                className={`text-[9px] font-bold tracking-widest ${
                  active ? "text-primary" : saving === look.id ? "text-muted-foreground" : "text-foreground/60"
                }`}
              >
                {active ? "IN USE" : saving === look.id ? "SAVING..." : "TAP TO USE"}
              </span>
            </button>
          );
        })}
      </div>

      {note && (
        <p
          className={`rounded-xl border px-3 py-2 text-[11px] font-bold tracking-wide ${
            note.ok ? "border-primary/40 bg-primary/10 text-primary" : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {note.text}
        </p>
      )}

      <p className="text-[10px] text-muted-foreground leading-snug">
        The lights on the globe stay the same in both looks: one light per country, brighter and busier where more
        customers and creators are, names on touch, and tapping a light opens that country's feed.
      </p>
    </div>
  );
};

export default AdminGlobeStyle;
