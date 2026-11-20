import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
type Data = { total: number; waiting: number; pro_paid: number; elite_paid: number; entries: { creator_id: string; ticket_id: string | null; pass_type: string; position: number | null; joined_at: string; owned: string; display_name: string | null; email: string | null; country: string | null }[] };
export default function AdminVipLaunchList() {
  const [data, setData] = useState<Data | null>(null);
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true; setBusy(true); setData(null); setError("");
    void supabase.rpc("admin_vip_launch_list", { _offset: offset }).then(({ data, error }) => {
      if (!active) return;
      if (error) setError("Sign in with an administrator account to view private VIP records.");
      else setData(data as unknown as Data);
      setBusy(false);
    });
    return () => { active = false; };
  }, [offset, revision]);
  return <section aria-label="Private VIP records" className="space-y-4 px-4 pb-8">
    <h2 className="font-display text-lg font-bold text-gold">VIP WAITING LIST & PAID PASSES</h2>
    <Button variant="outline" disabled={busy} onClick={() => setRevision(n => n + 1)}>REFRESH</Button>
    {busy && <p role="status">Loading VIP records…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {data && <>
      <p className="text-sm">{data.waiting} free waiting-list members · Pro paid: {data.pro_paid}/500 · Elite paid: {data.elite_paid}/500</p>
      <p className="text-xs text-muted-foreground">Tickets record interest, not sales. Payment invitations and the one-hour deadline are not active. Country below is account-declared, not proof of residence.</p>
      {!data.entries.length && <p>No VIP records yet.</p>}
      <div className="divide-y divide-border">{data.entries.map(e => <article key={e.creator_id} className="space-y-1 py-4">
        <p className="break-all font-semibold">{e.display_name || "Creator"} · {e.email || "Email unavailable"}</p>
        <p className="text-sm text-muted-foreground">{e.country || "Country not supplied"} · {e.pass_type === "PRO_PASS" ? "Pro" : "Elite"} · {e.position ? `Queue #${e.position}` : "Purchased"}</p>
        {e.ticket_id && <p className="font-mono text-xs">DTT-VIP-{e.ticket_id}</p>}
        <p className="text-sm text-gold">{e.owned === "NONE" ? "Waiting list · unpaid · no VIP benefits" : `Payment verified · ${e.owned === "PRO_PASS" ? "Pro" : "Elite"} active`}</p>
        <p className="text-xs text-muted-foreground">{new Date(e.joined_at).toLocaleString()}</p>
      </article>)}</div>
      <div className="flex items-center justify-between gap-3"><Button variant="outline" disabled={!offset || busy} onClick={() => setOffset(n => Math.max(0, n - 50))}>PREVIOUS</Button><span className="text-xs">{data.total ? offset + 1 : 0}–{Math.min(offset + 50, data.total)} of {data.total}</span><Button variant="outline" disabled={offset + 50 >= data.total || busy} onClick={() => setOffset(n => n + 50)}>NEXT</Button></div>
    </>}
  </section>;
}