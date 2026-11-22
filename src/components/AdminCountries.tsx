import { useEffect, useState } from "react";
import { getAdminPasscode } from "@/lib/adminSession";
import { countryName as translatedCountryName } from "@/lib/siteTranslate";
import { COUNTRIES } from "@/components/GlobalPassport";
const countryName = (code: string, fallback: string) => code === "GLOBAL" ? "Country not recorded" : translatedCountryName(code, COUNTRIES.find((c) => c.code === code)?.name ?? fallback);
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { foundingCountries } from "@/lib/foundingCreators";
import { Input } from "@/components/ui/input";

interface CountryRow { country: string; women: number; men: number }
export interface CountryCreator {
  user_id: string; display_name: string | null; email: string | null; country: string | null;
  vault_side: string; verification_status: string; created_at: string; role?: string;
  hearts: number; views: number; earned: number; unlocks: number; videos: number;
}

export function filterAdminCreators<T extends { vault_side: string }>(creators: T[], side: "all" | "women" | "men") {
  return side === "all" ? creators : creators.filter(c => side === "men" ? c.vault_side === "men" : c.vault_side !== "men");
}

const call = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("admin-finance", {
    headers: { "x-admin-passcode": getAdminPasscode() }, body: { action: "country_stats", ...body },
  });
  if (error || data?.error) throw new Error("Could not load country stats. Please retry.");
  return data;
};

const flag = (code: string) =>
  /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "🌐";

/** Owner view: every country with creators, then each creator's stats. */
const AdminCountries = ({ onOpenCreator }: { onOpenCreator: (c: CountryCreator) => void }) => {
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [side, setSide] = useState<"all" | "women" | "men">("all");
  const [creators, setCreators] = useState<CountryCreator[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const [error, setError] = useState("");
  const load = () => {
    setLoading(true); setError("");
    call({}).then((d) => {
      const map = new Map<string, CountryRow>(foundingCountries().map((c) => [c.code, { country: c.code, women: 0, men: 0 }]));
      for (const row of d?.countries ?? []) map.set(row.country, row);
      setCountries([...map.values()].sort((a, b) => countryName(a.country, a.country).localeCompare(countryName(b.country, b.country))));
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCountry = async (code: string) => {
    setOpen(code); setSide("all"); setCreators([]); setLoading(true); setError("");
    try { const d = await call({ country: code }); setCreators(Array.isArray(d?.creators) ? d.creators : []); }
    catch { setError("Could not load creators. Please retry."); }
    setLoading(false);
  };

  if (open) {
    const list = filterAdminCreators(creators, side);
    return (
      <div className="px-4 space-y-3">
        <Button variant="ghost" onClick={() => setOpen(null)} className="text-xs font-bold text-primary">← ALL COUNTRIES</Button>
        <p className="text-sm font-bold text-foreground">{flag(open)} {countryName(open, open)}</p>
        <div className="flex flex-wrap gap-2">
          {(["all", "women", "men"] as const).map((s) => (
            <Button variant="ghost" key={s} onClick={() => setSide(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider ${side === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {s === "all" ? "ALL" : s === "women" ? "WOMEN" : "MEN"} ({filterAdminCreators(creators, s).length})
            </Button>
          ))}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {loading && <p className="text-xs text-muted-foreground">Loading...</p>}
        {!loading && !error && list.length === 0 && <p className="text-xs text-muted-foreground">No creators here yet.</p>}
        {list.map((c) => (
          <Button variant="ghost" key={c.user_id} onClick={() => onOpenCreator(c)}
            className="w-full h-auto block whitespace-normal text-left rounded-lg border border-border bg-card p-3 hover:border-primary/50 transition-colors">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <p className="text-sm font-bold text-foreground break-all">@{c.display_name || "creator"}</p>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.verification_status || "Not submitted"}</span>
            </div>
            <p className="text-xs text-muted-foreground break-all">{c.email || "Email unavailable"}</p>
            <div className="mt-2 grid grid-cols-5 gap-1 text-center">
              {[["HEARTS", c.hearts], ["VIEWS", c.views], ["VIDEOS", c.videos], ["UNLOCKS", c.unlocks], ["EARNED", `$${c.earned.toFixed(0)}`]].map(([l, v]) => (
                <div key={l as string}><p className="text-xs font-bold text-foreground">{v}</p><p className="text-[9px] text-muted-foreground">{l}</p></div>
              ))}
            </div>
          </Button>
        ))}
      </div>
    );
  }

  const shown = countries.filter((c) => c.women + c.men > 0 && (!q || countryName(c.country, c.country).toLowerCase().includes(q.toLowerCase()) || c.country.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="px-4 space-y-3">
      <Button variant="outline" size="sm" disabled={loading} onClick={load}>REFRESH</Button>
      <div>
        <p className="text-sm font-bold text-foreground">Creators by country</p>
        <p className="text-xs text-muted-foreground">{countries.reduce((total, c) => total + c.women + c.men, 0)} creator accounts · approval status shown separately</p>
      </div>
      <Input aria-label="Search creator countries" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search country..." />
      {error && <p className="text-xs text-destructive">{error}</p>}
        {loading && <p className="text-xs text-muted-foreground">Loading...</p>}
      {!loading && !error && shown.length === 0 && <p className="text-xs text-muted-foreground">No creators yet.</p>}
      {shown.map((c) => (
        <Button variant="ghost" key={c.country} onClick={() => void openCountry(c.country)}
          className="w-full h-auto whitespace-normal flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/50 transition-colors">
          <span className="text-sm font-bold text-foreground">{flag(c.country)} {countryName(c.country, c.country)}</span>
          <span className="text-xs text-muted-foreground">{c.women + c.men} creators</span>
        </Button>
      ))}
    </div>
  );
};

export default AdminCountries;
