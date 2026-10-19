import { useEffect, useMemo, useState } from "react";
import { getAdminPasscode } from "@/lib/adminSession";
import { countryName } from "@/lib/siteTranslate";

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

  useEffect(() => {
    fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/admin-finance`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-passcode": getAdminPasscode() },
      body: JSON.stringify({ action: "founding_creators" }),
    }).then((r) => r.json())
      .then((d) => { if (Array.isArray(d?.rows)) setRows(d.rows); else setError(d?.error || "Failed to load"); })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const countries = useMemo(() => {
    const m = new Map<string, { women: FoundingRow[]; men: FoundingRow[] }>();
    for (const r of rows) {
      const e = m.get(r.country) ?? { women: [], men: [] };
      e[r.vault_side].push(r);
      m.set(r.country, e);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const List = ({ side, list }: { side: "women" | "men"; list: FoundingRow[] }) => (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold tracking-wider text-primary">{side === "women" ? "WOMEN" : "MEN"} · {list.length}/10</p>
      {Array.from({ length: 10 }, (_, i) => {
        const r = list.find((x) => x.slot === i + 1);
        const active = r && new Date(r.ends_at).getTime() > Date.now();
        return (
          <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs">
            <span className="text-muted-foreground w-6">#{i + 1}</span>
            {r ? (
              <>
                <span className="flex-1 truncate text-foreground">{r.display_name || r.email || "Creator"}</span>
                <span className={active ? "text-primary font-bold" : "text-muted-foreground"}>
                  {active ? `${r.split_creator}/${r.split_platform} until ${day(r.ends_at)}` : `Ended ${day(r.ends_at)}`}
                </span>
              </>
            ) : <span className="flex-1 text-muted-foreground">Open slot</span>}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="px-4 space-y-3">
      <p className="text-xs text-muted-foreground">
        The first 10 approved women and 10 approved men creators in each country are locked in automatically at 92/8 for one year from approval. Slots are permanent and never reshuffle.
      </p>
      {loading && <p className="text-xs text-muted-foreground">Loading...</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!loading && !error && countries.length === 0 && <p className="text-xs text-muted-foreground">No founding creators yet.</p>}
      {countries.map(([code, g]) => (
        <div key={code} className="rounded-xl border border-border bg-card">
          <button onClick={() => setOpen(open === code ? null : code)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-foreground">
            <span>{flag(code)} {countryName(code, code).toUpperCase()}</span>
            <span className="text-xs text-muted-foreground">W {g.women.length}/10 · M {g.men.length}/10</span>
          </button>
          {open === code && (
            <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
              <List side="women" list={g.women} />
              <List side="men" list={g.men} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminFoundingCreators;
