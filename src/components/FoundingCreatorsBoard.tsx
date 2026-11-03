import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { countryName as translatedCountryName } from "@/lib/siteTranslate";
import { COUNTRIES } from "@/components/GlobalPassport";
import { FOUNDING_SLOTS } from "@/lib/foundingCreators";

type Row = { country: string; vault_side: string; slot: number; display_name: string | null };
const name = (code: string) => translatedCountryName(code, COUNTRIES.find((c) => c.code === code)?.name ?? code);

/** Customer-facing list of founding creators per country (usernames only). */
const FoundingCreatorsBoard = ({ onCreatorClick }: { onCreatorClick?: (name: string) => void }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  useEffect(() => {
    void supabase.rpc("get_founding_creators_public").then(({ data }) => { setRows((data as Row[]) ?? []); setLoading(false); });
  }, []);
  const groups = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows) m.set(r.country, [...(m.get(r.country) ?? []), r]);
    return [...m.entries()].filter(([c]) => name(c).toLowerCase().includes(query.toLowerCase()) || c.toLowerCase().includes(query.toLowerCase()));
  }, [rows, query]);
  const side = (list: Row[], s: string, label: string) => (
    <div className="space-y-1">
      <p className="text-[11px] font-bold tracking-wider text-primary">{label}</p>
      {Array.from({ length: FOUNDING_SLOTS }, (_, i) => {
        const r = list.find((x) => x.vault_side === s && x.slot === i + 1);
        return r?.display_name ? (
          <button key={i} onClick={() => onCreatorClick?.(r.display_name!.replace(/^@/, ""))} className="block w-full rounded-lg bg-secondary/50 px-3 py-2 text-left text-xs text-foreground hover:bg-secondary">
            #{i + 1} @{r.display_name.replace(/^@/, "")}
          </button>
        ) : <p key={i} className="rounded-lg bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">#{i + 1} Coming soon</p>;
      })}
    </div>
  );
  return (
    <div className="px-4 space-y-3">
      <h2 className="font-bold text-gold">FOUNDING CREATORS</h2>
      <p className="text-xs text-muted-foreground">The first 5 women and 5 men creators approved in each country.</p>
      <Input aria-label="Search countries" placeholder="Search country…" value={query} onChange={(e) => setQuery(e.target.value)} />
      {loading && <p className="text-xs text-muted-foreground">Loading...</p>}
      {!loading && groups.length === 0 && <p className="text-xs text-muted-foreground">No founding creators yet.</p>}
      {groups.map(([code, list]) => (
        <div key={code} className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-bold">{name(code).toUpperCase()}</p>
          <div className="grid gap-3 sm:grid-cols-2">{side(list, "women", "WOMEN")}{side(list, "men", "MEN")}</div>
        </div>
      ))}
    </div>
  );
};
export default FoundingCreatorsBoard;
