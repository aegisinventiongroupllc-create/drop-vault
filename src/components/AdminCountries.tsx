import { useEffect, useState } from "react";
import { getAdminPasscode } from "@/lib/adminSession";
import { countryName } from "@/lib/siteTranslate";

interface CountryRow { country: string; women: number; men: number }
export interface CountryCreator {
  user_id: string; display_name: string | null; email: string | null; country: string | null;
  vault_side: string; verification_status: string; created_at: string; role?: string;
  hearts: number; views: number; earned: number; unlocks: number; videos: number;
}

const call = async (body: Record<string, unknown>) => {
  const res = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/admin-finance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-passcode": getAdminPasscode() },
    body: JSON.stringify({ action: "country_stats", ...body }),
  });
  return res.json();
};

const flag = (code: string) =>
  /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "🌐";

/** Owner view: every country with creators, then each creator's stats. */
const AdminCountries = ({ onOpenCreator }: { onOpenCreator: (c: CountryCreator) => void }) => {
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [side, setSide] = useState<"women" | "men">("women");
  const [creators, setCreators] = useState<CountryCreator[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    setLoading(true);
    call({}).then((d) => setCountries(Array.isArray(d?.countries) ? d.countries : [])).catch(() => setCountries([])).finally(() => setLoading(false));
  }, []);

  const openCountry = async (code: string) => {
    setOpen(code); setCreators([]); setLoading(true);
    try { const d = await call({ country: code }); setCreators(Array.isArray(d?.creators) ? d.creators : []); }
    catch { setCreators([]); }
    setLoading(false);
  };

  if (open) {
    const list = creators.filter((c) => (side === "men" ? c.vault_side === "men" : c.vault_side !== "men"));
    return (
      <div className="px-4 space-y-3">
        <button onClick={() => setOpen(null)} className="text-xs font-bold text-primary">← ALL COUNTRIES</button>
        <p className="text-sm font-bold text-foreground">{flag(open)} {countryName(open, open)}</p>
        <div className="flex gap-2">
          {(["women", "men"] as const).map((s) => (
            <button key={s} onClick={() => setSide(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider ${side === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {s === "women" ? "WOMEN" : "MEN"} ({creators.filter((c) => (s === "men" ? c.vault_side === "men" : c.vault_side !== "men")).length})
            </button>
          ))}
        </div>
        {loading && <p className="text-xs text-muted-foreground">Loading...</p>}
        {!loading && list.length === 0 && <p className="text-xs text-muted-foreground">No creators here yet.</p>}
        {list.map((c) => (
          <button key={c.user_id} onClick={() => onOpenCreator(c)}
            className="w-full text-left rounded-xl border border-border bg-card p-3 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">@{c.display_name || "creator"}</p>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.verification_status}</span>
            </div>
            <div className="mt-2 grid grid-cols-5 gap-1 text-center">
              {[["HEARTS", c.hearts], ["VIEWS", c.views], ["VIDEOS", c.videos], ["UNLOCKS", c.unlocks], ["EARNED", `$${c.earned.toFixed(0)}`]].map(([l, v]) => (
                <div key={l as string}><p className="text-xs font-bold text-foreground">{v}</p><p className="text-[9px] text-muted-foreground">{l}</p></div>
              ))}
            </div>
          </button>
        ))}
      </div>
    );
  }

  const shown = countries.filter((c) => !q || countryName(c.country, c.country).toLowerCase().includes(q.toLowerCase()) || c.country.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="px-4 space-y-3">
      <div>
        <p className="text-sm font-bold text-foreground">Creators by country</p>
        <p className="text-xs text-muted-foreground">Tap a country to see every creator's stats</p>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search country..."
        className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      {loading && <p className="text-xs text-muted-foreground">Loading...</p>}
      {!loading && shown.length === 0 && <p className="text-xs text-muted-foreground">No creators yet.</p>}
      {shown.map((c) => (
        <button key={c.country} onClick={() => void openCountry(c.country)}
          className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/50 transition-colors">
          <span className="text-sm font-bold text-foreground">{flag(c.country)} {countryName(c.country, c.country)}</span>
          <span className="text-xs text-muted-foreground">Women {c.women} · Men {c.men}</span>
        </button>
      ))}
    </div>
  );
};

export default AdminCountries;
