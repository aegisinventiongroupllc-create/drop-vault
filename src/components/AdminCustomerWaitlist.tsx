import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { COUNTRIES } from "./GlobalPassport";
import { waitlistEntryForecast } from "@/lib/waitlistForecast";
type Data = { total: number; countries: { country: string; total: number }[]; entries: { user_id: string; email: string | null; country: string; language: string; joined_at: string }[] };
const name = (code: string) => COUNTRIES.find(c => c.code === code)?.name ?? code;
export default function AdminCustomerWaitlist() {
  const [data, setData] = useState<Data | null>(null);
  const [country, setCountry] = useState("");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const forecast = waitlistEntryForecast(data?.total ?? 0);
  const dollars = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  useEffect(() => {
    let active = true; setBusy(true); setData(null); setError("");
    void supabase.rpc("admin_customer_launch_waitlist", { _country: country || undefined, _offset: offset }).then(({ data, error }) => {
      if (!active) return;
      if (error) setError("Sign in with an administrator account to view the private customer waiting list.");
      else setData(data as unknown as Data);
      setBusy(false);
    });
    return () => { active = false; };
  }, [country, offset, refresh]);
  return <section className="space-y-4 px-4 pb-8">
    <h2 className="font-display text-lg font-bold">CUSTOMER WAITING LIST</h2>
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="admin-waitlist-country">Country</label>
      <select id="admin-waitlist-country" className="max-w-full rounded-lg border border-border bg-background p-2" value={country} onChange={e => { setCountry(e.target.value); setOffset(0); }}>
        <option value="">All countries</option>{COUNTRIES.filter(c => c.code !== "GLOBAL").map(c => <option value={c.code} key={c.code}>{c.name}</option>)}
      </select>
      <Button variant="outline" disabled={busy} onClick={() => setRefresh(n => n + 1)}>REFRESH</Button>
    </div>
    {busy && <p role="status">Loading waiting list…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {data && <>
      <p className="font-semibold text-gold">{data.total} customers{country ? ` · ${name(country)}` : " · all countries"}</p>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">{data.countries.map(c => <span key={c.country}>{name(c.country)}: {c.total}</span>)}</div>
      <div className="space-y-3 border-y border-border py-4">
        <h3 className="font-display font-semibold">Annual entry sales scenarios</h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><dt className="text-sm text-muted-foreground">If every listed customer buys one year</dt><dd className="text-2xl font-semibold text-gold">{dollars(forecast.fullParticipationGross)}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Example only: if 25% buy one year</dt><dd className="text-2xl font-semibold text-foreground">{dollars(forecast.quarterParticipationGross)}</dd></div>
        </dl>
        <p className="text-sm text-muted-foreground">{forecast.customers} listed accounts · $10 per paid year for founding customers. Joining is free. These are hypothetical gross sales, not payments received, a conversion prediction or family take-home income. Annual renewal is not guaranteed.</p>
        <p className="text-xs text-muted-foreground">Entry sales exclude creator purchases, tips and VIP passes. Profit also depends on payment fees, hosting, storage, refunds, operating expenses and taxes. See REVENUE for recorded financial activity.</p>
      </div>
      {!data.entries.length && <p>No customers on this page yet.</p>}
      <div className="divide-y divide-border">{data.entries.map(e => <article key={e.user_id} className="py-4">
        <p className="break-all font-semibold">{e.email ?? "Account email unavailable"}</p>
        <p className="text-sm text-muted-foreground">{name(e.country)} · {e.language}</p>
        <p className="text-xs text-muted-foreground">Joined {new Date(e.joined_at).toLocaleString()}</p>
      </article>)}</div>
      <div className="flex items-center justify-between gap-3"><Button variant="outline" disabled={!offset || busy} onClick={() => setOffset(n => Math.max(0, n - 50))}>PREVIOUS</Button><span className="text-xs">{data.total ? offset + 1 : 0}–{Math.min(offset + 50, data.total)} of {data.total}</span><Button variant="outline" disabled={offset + 50 >= data.total || busy} onClick={() => setOffset(n => n + 50)}>NEXT</Button></div>
    </>}
  </section>;
}