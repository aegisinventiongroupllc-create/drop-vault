import { useEffect, useMemo, useState } from "react";
import { getAdminPasscode } from "@/lib/adminSession";
import { countryName } from "@/lib/siteTranslate";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { foundingCountries, foundingSlots } from "@/lib/foundingCreators";

interface FoundingRow {
  creator_id: string; country: string; vault_side: "women" | "men"; slot: number;
  locked_at: string; ends_at: string; split_creator: number; split_platform: number;
  display_name: string | null; email: string | null;
}

const flag = (code: string) =>
  /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "🌐";
const day = (s: string) => new Date(s).toLocaleDateString(undefined, { dateStyle: "medium" });

/** Owner record of the first 10 women and 10 men approved creators per country (92/8 for 365 days). */
const AdminFoundingCreators = () => {
  const [rows, setRows] = useState<FoundingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const load = async () => {
    setLoading(true); setError("");
    try {
      const { data, error: requestError } = await supabase.functions.invoke("admin-finance", {
        headers: { "x-admin-passcode": getAdminPasscode() }, body: { action: "founding_creators" },
      });
      if (requestError || data?.error || !Array.isArray(data?.rows)) throw new Error("Could not load founding creators. Please retry.");
      setRows(data.rows);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load founding creators."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const countries = useMemo(() => {
    const m = new Map<string, { women: FoundingRow[]; men: FoundingRow[] }>();
    for (const c of foundingCountries()) m.set(c.code, { women: [], men: [] });
    for (const r of rows) {
      const e = m.get(r.country) ?? { women: [], men: [] };
      e[r.vault_side].push(r);
      m.set(r.country, e);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const List = ({ side, list, country }: { side: "women" | "men"; list: FoundingRow[]; country: string }) => (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold tracking-wider text-primary">{side === "women" ? "WOMEN" : "MEN"} · {list.length}/10</p>
      {foundingSlots(list, country, side).map(({ slot, creator: r }) => {
        const active = r && new Date(r.ends_at).getTime() > Date.now();
        return (
          <div key={slot} className="flex flex-wrap items-start gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs">
            <span className="text-muted-foreground w-6 shrink-0">#{slot}</span>
            {r ? (
              <>
                <span className="flex-1 min-w-0 break-words text-foreground">{r.display_name ? `@${r.display_name.replace(/^@/, "")}` : "Username not set"}</span>
                <span className={active ? "w-full pl-8 text-primary font-bold" : "w-full pl-8 text-muted-foreground"}>
                  {active ? `${r.split_creator}/${r.split_platform} until ${day(r.ends_at)}` : `Ended ${day(r.ends_at)}`}
                </span>
              </>
            ) : <div className="flex-1"><p className="text-gold font-semibold">Claim your 92/8 split</p><p className="text-muted-foreground mt-1">On creator approval · 365 days</p></div>}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="px-4 space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2"><h2 className="font-bold">FOUNDING 10 BY COUNTRY</h2><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>REFRESH</Button></div>
      <Input aria-label="Search founding countries" placeholder="Search country…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <p className="text-xs text-muted-foreground">
        The first 10 approved women and 10 approved men creators in each country are locked in automatically at 92/8 for one year from approval. Slots are permanent and never reshuffle.
      </p>
      {loading && <p className="text-xs text-muted-foreground">Loading...</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!loading && !error && countries.length === 0 && <p className="text-xs text-muted-foreground">No founding creators yet.</p>}
      {!loading && !error && countries.filter(([code]) => countryName(code, code).toLowerCase().includes(query.toLowerCase()) || code.toLowerCase().includes(query.toLowerCase())).map(([code, g]) => (
        <div key={code} className="rounded-lg border border-border bg-card">
          <Button variant="ghost" aria-expanded={open === code} onClick={() => setOpen(open === code ? null : code)} className="w-full h-auto flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm font-bold text-foreground whitespace-normal text-left">
            <span>{flag(code)} {countryName(code, code).toUpperCase()}</span>
            <span className="text-xs text-muted-foreground">W {g.women.length}/10 · M {g.men.length}/10</span>
          </Button>
          {open === code && (
            <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
              <List side="women" list={g.women} country={code} />
              <List side="men" list={g.men} country={code} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminFoundingCreators;
