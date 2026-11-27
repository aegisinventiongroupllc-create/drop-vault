import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { COUNTRIES } from "./GlobalPassport";
import { waitlistEntryForecast } from "@/lib/waitlistForecast";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { customerWaitlistTicket } from '@/lib/customerWaitlistTicket';
type Data = { total: number; countries: { country: string; total: number }[]; entries: { user_id: string; email: string | null; country: string; language: string; joined_at: string }[] };
const name = (code: string) => COUNTRIES.find(c => c.code === code)?.name ?? code;
export default function AdminCustomerWaitlist() {
  const [data, setData] = useState<Data | null>(null);
  const [country, setCountry] = useState("");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [ready, setReady] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{ started: boolean; sent: number; failed: number; pending: number } | null>(null);
  useEffect(() => {
    let active = true;
    // Only ask the server when an account session exists; passcode previews stay locked instead of erroring.
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { if (active) setReady(false); return; }
      try {
        const { data, error } = await supabase.functions.invoke('waitlist-payment-invitations', { body: { action: 'status' } });
        if (active) setReady(!error && data?.enabled === true);
      } catch { if (active) setReady(false); }
    });
    void supabase.rpc('admin_customer_waitlist_campaign_status').then(({ data, error }) => { if (active && !error) setProgress(data as unknown as typeof progress); });
    return () => { active = false; };
  }, [refresh]);
  const sendInvitations = async () => {
    setConfirmSend(false); setSending(true); setError('');
    try {
      // Bounded work; large lists resume without resending completed emails.
      for (let batch = 0; batch < 20; batch++) {
        const { data, error } = await supabase.functions.invoke('waitlist-payment-invitations', { body: { action: 'send', confirm: true } });
        if (error || data?.error) throw new Error('Sending is not available. Check launch and payment readiness, then retry. Saved progress is retained.');
        const status = await supabase.rpc('admin_customer_waitlist_campaign_status');
        if (status.error) throw new Error('Could not refresh invitation progress. Please refresh the list.');
        setProgress(status.data as unknown as typeof progress);
        if (!data.processed || data.processed < 25) break;
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Invitations could not be sent.'); }
    finally { setSending(false); setRefresh(n => n + 1); }
  };
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
    {data && <section aria-label="Waiting customers by country" className="space-y-3 border-y border-border py-4">
      <h3 className="font-semibold">Waiting customers by country</h3>
      <Button variant={!country ? "default" : "outline"} onClick={() => { setCountry(""); setOffset(0); }} className="h-auto min-h-11 w-full justify-between whitespace-normal"><span>ALL COUNTRIES</span><span>{data.countries.reduce((total, c) => total + c.total, 0)}</span></Button>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{[...data.countries].sort((a, b) => name(a.country).localeCompare(name(b.country))).map(c => <Button key={c.country} variant={country === c.country ? "default" : "outline"} aria-pressed={country === c.country} onClick={() => { setCountry(c.country); setOffset(0); }} className="h-auto min-h-11 min-w-0 justify-between gap-3 whitespace-normal text-left"><span className="break-words">{name(c.country)}</span><span>{c.total}</span></Button>)}</div>
      {!data.countries.length && <p className="text-sm text-muted-foreground">No customers have joined yet.</p>}
    </section>}
    <div className="space-y-3 border-y border-border py-4">
      <h3 className="font-semibold">Launch payment invitations</h3>
      <p className="text-sm text-muted-foreground">Invite all eligible waiting-list customers, across every country, by email and inside DTT. No invoices, automatic charges or access grants.</p>
      <Button variant="neon" disabled={!ready || sending || !data?.total || (progress?.started === true && progress.pending === 0)} className="h-auto min-h-12 w-full whitespace-normal sm:w-auto" onClick={() => setConfirmSend(true)}>{sending ? 'SENDING INVITATIONS…' : progress?.started ? 'CONTINUE SENDING PAY NOW INVITATIONS' : 'SEND PAY NOW TO ALL WAITING CUSTOMERS'}</Button>
      {!ready && <p className="text-xs text-muted-foreground">Locked until New Year launch and verified payment readiness. No emails are sent now.</p>}
      {progress?.started && <p role="status" className="text-sm">{progress.sent} emails sent · {progress.pending} remaining · {progress.failed} failed, suppressed or missing email. Account invitations remain available to eligible customers.</p>}
    </div>
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
      <div className="space-y-3 border-y border-border py-4">
        <h3 className="font-display font-semibold">Annual entry sales scenarios</h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><dt className="text-sm text-muted-foreground">If every listed customer buys one year</dt><dd className="text-2xl font-semibold text-gold">{dollars(forecast.fullParticipationGross)}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Example only: if 25% buy one year</dt><dd className="text-2xl font-semibold text-foreground">{dollars(forecast.quarterParticipationGross)}</dd></div>
        </dl>
        <p className="text-sm text-muted-foreground">{forecast.customers} listed accounts · $10 per paid year for founding customers. Joining is free. These are hypothetical gross sales, not payments received, a conversion prediction or family take-home income. Annual renewal is not guaranteed.</p>
        <p className="text-xs text-muted-foreground">Entry sales exclude creator purchases, tips and VIP passes. Profit also depends on payment fees, hosting, storage, refunds, operating expenses and taxes. See REVENUE for recorded financial activity.</p>
      </div>
      <h3 className="font-semibold">{country ? `${name(country)} · customer accounts` : "Customer accounts · all countries"}</h3>
      {!data.entries.length && <p>No customers on this page yet.</p>}
      <div className="divide-y divide-border">{data.entries.map(e => <article key={e.user_id} className="py-4">
        <p className="break-all font-semibold">{e.email ?? "Account email unavailable"}</p>
        <p className="text-sm text-muted-foreground">{name(e.country)} · {e.language}</p>
        <p className="text-xs text-muted-foreground">Joined {new Date(e.joined_at).toLocaleString()}</p>
        <p className="notranslate break-all font-mono text-xs" translate="no">{customerWaitlistTicket(e)?.number ?? "Ticket unavailable"}</p>
      </article>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" disabled={!offset || busy} onClick={() => setOffset(n => Math.max(0, n - 50))}>PREVIOUS</Button><span className="text-xs">{data.entries.length ? offset + 1 : 0}–{Math.min(offset + data.entries.length, data.total)} of {data.total}</span><Button variant="outline" disabled={offset + 50 >= data.total || busy} onClick={() => setOffset(n => n + 50)}>NEXT</Button></div>
    </>}
    <Dialog open={confirmSend} onOpenChange={setConfirmSend}><DialogContent><DialogTitle>Invite all waiting customers to pay?</DialogTitle><DialogDescription>This sends an email and adds an account invitation across all countries—not just the country currently selected. Each customer chooses whether to buy their $10 annual entry. Email usage charges may apply; large lists continue in batches with saved progress.</DialogDescription><Button variant="neon" onClick={() => void sendInvitations()}>CONFIRM & SEND INVITATIONS</Button></DialogContent></Dialog>
  </section>;
}