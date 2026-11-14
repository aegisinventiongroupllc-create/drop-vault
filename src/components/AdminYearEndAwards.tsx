import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { countryName } from "@/lib/siteTranslate";

type Candidate = { award_year: number; country: string; creator_id: string; display_name: string | null; followers: number };
type Award = { country: string; creator_id: string; confirmed_at: string };

export default function AdminYearEndAwards() {
  const lastYear = new Date().getUTCFullYear() - 1;
  const [year, setYear] = useState(Math.max(2026, lastYear));
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [prepared, setPrepared] = useState(false);
  const [excluded, setExcluded] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Candidate | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const result = user ? await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }) : null;
      if (active) { setAuthorized(result?.data === true); setChecking(false); }
    })();
    return () => { active = false; };
  }, []);

  const load = async (targetYear: number) => {
    setBusy(true); setError("");
    try {
      const [review, leaders, confirmed] = await Promise.all([
        supabase.from("year_end_award_reviews").select("excluded_country_count").eq("award_year", targetYear).maybeSingle(),
        supabase.from("year_end_award_candidates").select("*").eq("award_year", targetYear).order("country").order("creator_id"),
        supabase.from("creator_lifetime_awards").select("country,creator_id,confirmed_at").eq("award_year", targetYear),
      ]);
      if (review.error || leaders.error || confirmed.error) throw new Error("Could not load year-end awards. Please retry.");
      setPrepared(Boolean(review.data)); setExcluded(review.data?.excluded_country_count ?? 0);
      setCandidates(leaders.data ?? []); setAwards(confirmed.data ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load awards."); }
    finally { setBusy(false); }
  };
  useEffect(() => { if (authorized) { setCandidates([]); setAwards([]); setPrepared(false); void load(year); } }, [authorized, year]);

  const prepare = async () => {
    setBusy(true); setError("");
    const { error: failure } = await supabase.rpc("prepare_year_end_awards", { _year: year });
    if (failure) { setError(failure.message); setBusy(false); return; }
    await load(year);
  };
  const confirmAward = async () => {
    if (!selected) return;
    setBusy(true); setError("");
    const { error: failure } = await supabase.rpc("confirm_year_end_award", { _year: selected.award_year, _country: selected.country, _creator: selected.creator_id });
    if (failure) { setError(failure.message); setBusy(false); return; }
    setSelected(null); await load(year);
  };

  if (checking) return <p className="px-4 text-muted-foreground">Checking administrator access…</p>;
  if (!authorized) return <p className="px-4 text-destructive">Sign in with an administrator account to review year-end awards.</p>;
  const countries = [...new Set(candidates.map(c => c.country))];
  return <div className="px-4 space-y-4">
    <h2 className="font-display font-bold text-foreground">YEAR-END AWARDS</h2>
    <p className="text-sm text-muted-foreground">One country winner · 95/5 vault split for life · administrator confirmation required</p>
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm text-foreground">Award year<Input aria-label="Award year" type="number" min={2026} max={Math.max(2026, lastYear)} value={year} disabled={busy} className="mt-1 w-28" onChange={e => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 2026 && n <= Math.max(2026,lastYear)) setYear(n); }} /></label>
      <Button variant="outline" disabled={busy} onClick={() => void load(year)}>REFRESH</Button>
      {!prepared && <Button disabled={busy || year > lastYear} onClick={() => void prepare()}>PREPARE REVIEW</Button>}
    </div>
    {year > lastYear && <p className="text-sm text-muted-foreground">The {year} review opens January 1, {year + 1} UTC, after the year closes.</p>}
    {busy && <p role="status" className="text-sm text-muted-foreground">Loading…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {prepared && <p className="text-sm text-muted-foreground">Total unique paid library followers before January 1, {year + 1} UTC. Both vaults compete together. Likes and repeat purchases do not count. Custom-request splits stay unchanged.</p>}
    {excluded > 0 && <p className="text-sm text-destructive">{excluded} creator(s) with paid followers lack verified year-end residence information and were excluded.</p>}
    {prepared && !busy && countries.length === 0 && <p className="text-sm text-muted-foreground">No eligible country leaders with paid followers for {year}.</p>}
    {countries.map(code => {
      const leaders = candidates.filter(c => c.country === code), award = awards.find(a => a.country === code);
      return <section key={code} className="border-t border-border pt-4 space-y-3">
        <h3 className="font-bold text-foreground">{countryName(code, code)} · {leaders[0]?.followers.toLocaleString()} paid followers</h3>
        {leaders.length > 1 && !award && <p className="text-sm text-muted-foreground">Tied leaders — select one winner for this country.</p>}
        {leaders.map(c => <div key={c.creator_id} className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0"><p className="break-words text-foreground">{c.display_name || "Username not set"}</p><p className="break-all text-xs text-muted-foreground">{c.creator_id}</p></div>
          {award ? <span className="text-sm text-gold">{award.creator_id === c.creator_id ? `95/5 for life · confirmed ${new Date(award.confirmed_at).toLocaleDateString()}` : "Not selected"}</span> : <Button variant="outline" disabled={busy} onClick={() => setSelected(c)}>REVIEW AWARD</Button>}
        </div>)}
      </section>;
    })}
    <AlertDialog open={Boolean(selected)} onOpenChange={open => { if (!open && !busy) setSelected(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Confirm lifetime 95/5 award?</AlertDialogTitle><AlertDialogDescription>
          {selected?.display_name || selected?.creator_id} · {selected ? countryName(selected.country, selected.country) : ""} · {selected?.award_year} · {selected?.followers.toLocaleString()} paid followers. This permanent award replaces any lower vault split for future earnings. Past earnings and custom requests are unchanged. Only one winner can be confirmed per country for this year.
        </AlertDialogDescription></AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>CANCEL</AlertDialogCancel><Button disabled={busy} onClick={() => void confirmAward()}>CONFIRM 95/5 FOR LIFE</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}