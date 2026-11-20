import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { COUNTRIES } from "./GlobalPassport";

type Ranking = { start_day: string; end_day: string; today_total: number; entries: { creator_id: string; display_name: string | null; email: string | null; country: string | null; days: number; latest_day: string }[] };
export default function AdminFounderPokes() {
  const [data, setData] = useState<Ranking | null>(null);
  const [day, setDay] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setBusy(true); setError(""); setData(null);
    void supabase.rpc("admin_founder_poke_top_ten", { _end_day: day || undefined }).then(result => {
      if (!active) return;
      if (result.error) setError("Unable to load this review. Sign in with an administrator account and choose a date no later than today in New York.");
      else setData(result.data as unknown as Ranking);
      setBusy(false);
    });
    return () => { active = false; };
  }, [day, refresh]);
  return <section aria-label="Creator poke review" className="px-4 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold text-foreground">Top 10 creator check-ins</h2><p className="text-xs text-muted-foreground">Private participation review · no automatic revenue changes</p></div>
      <Button variant="outline" disabled={busy} onClick={() => setRefresh(n => n + 1)}>REFRESH</Button>
    </div>
    <label className="block max-w-xs text-sm text-muted-foreground">Review ending date (New York)
      <Input type="date" aria-label="Poke review ending date" value={day} onChange={e => setDay(e.target.value)} className="mt-2" />
    </label>
    {busy && <p role="status" className="text-sm text-muted-foreground">Loading creator check-ins…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {data && <>
      <p className="text-sm text-muted-foreground">{data.start_day} – {data.end_day} · {data.today_total} pokes on the ending date</p>
      <p className="text-xs text-muted-foreground">Ranked by distinct days over 365 days, then most recent check-in. 365 / 365 means every day; missed days cannot be backdated. This is separate from paid-follower year-end awards.</p>
      <ol className="divide-y divide-border">
        {data.entries.map((entry, i) => <li key={entry.creator_id} className="flex items-start gap-3 py-4">
          <span className="w-6 shrink-0 text-gold font-semibold">{i + 1}</span>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground break-words">{entry.display_name || "Unnamed creator"}</p><p className="text-xs text-muted-foreground break-all">{entry.email || entry.creator_id}</p>
            <p className="text-xs text-muted-foreground">{COUNTRIES.find(c => c.code === entry.country)?.name || entry.country || "Country not set"} · Last poke {entry.latest_day}</p></div>
          <div className="shrink-0 text-right"><p className="text-sm font-semibold text-primary">{entry.days} / 365</p><p className="text-xs text-muted-foreground">days</p></div>
        </li>)}
      </ol>
      {data.entries.length === 0 && <p className="py-6 text-sm text-muted-foreground">No creator pokes in this review period yet.</p>}
    </>}
  </section>;
}