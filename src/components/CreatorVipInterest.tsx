import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LAUNCH_AT } from "@/lib/launchCountdown";

type Pass = "PRO_PASS" | "ELITE_PASS";
type Interest = { capacity: number; joined: number; entry: { pass_type: Pass; position: number } | null };

export default function CreatorVipInterest({ creatorId }: { creatorId: string | null }) {
  const [status, setStatus] = useState<Interest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [newYear, setNewYear] = useState(() => Date.now() >= LAUNCH_AT);
  useEffect(() => {
    const timer = window.setInterval(() => setNewYear(Date.now() >= LAUNCH_AT), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let cancelled = false;
    setStatus(null); setError("");
    if (!creatorId) return;
    void supabase.rpc("my_vip_interest", { _action: "status" }).then(({ data, error: failure }) => {
      if (cancelled) return;
      if (failure) setError("Your VIP waiting-list spot could not be loaded. Please retry.");
      else setStatus(data as unknown as Interest);
    });
    return () => { cancelled = true; };
  }, [creatorId]);
  const save = async (action: "join" | "leave" | "status", pass?: Pass) => {
    if (!creatorId || busy) return;
    setBusy(true); setError("");
    try {
      const { data, error: failure } = await supabase.rpc("my_vip_interest", { _action: action, ...(pass ? { _pass: pass } : {}) });
      if (failure) throw failure;
      setStatus(data as unknown as Interest);
    } catch (e) { setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Your spot could not be saved. Please retry."); }
    finally { setBusy(false); }
  };
  const full = !!status && status.joined >= status.capacity && !status.entry;
  return <section className="mx-auto w-full max-w-xl border-y border-gold/30 px-4 py-4 space-y-3" aria-label="VIP launch waiting list">
    <h3 className="font-display text-sm font-bold text-gold">VIP LAUNCH WAITING LIST</h3>
    <p className="text-xs text-muted-foreground">1,000 VIP passes worldwide, Pro and Elite combined. Join free to register your interest; this is not a guaranteed pass reservation. Purchase availability and verified payment determine activation.</p>
    {status?.entry && <p role="status" className="text-sm font-semibold text-primary">Your waiting-list position: #{status.entry.position} of {status.capacity.toLocaleString()} · {status.entry.pass_type === "PRO_PASS" ? "Pro Pass" : "Elite Pass"}</p>}
    {status?.entry && <p className="text-sm text-gold">Congratulations! You’re on the list. After verified payment, {status.entry.pass_type === "PRO_PASS" ? "Pro offers a 92/8" : "Elite offers a 93/7"} vault revenue split instead of the standard 90/10. Earnings are not guaranteed.</p>}
    <p className="text-xs text-foreground">{newYear ? "Happy New Year! " : ""}Payment invitations and the one-hour deadline are not active. Joining does not start a payment timer. Crypto or debit availability will depend on approved payment options; your place will not expire while payment is unavailable.</p>
    {status && !status.entry && <p className="text-xs text-muted-foreground">{status.joined.toLocaleString()} / {status.capacity.toLocaleString()} waiting-list places taken.</p>}
    {full && <p role="status" className="text-sm text-gold">The VIP waiting list is full.</p>}
    <div className="grid grid-cols-2 gap-2">
      {(["PRO_PASS", "ELITE_PASS"] as const).map(pass => <Button key={pass} variant={status?.entry?.pass_type === pass ? "gold" : "outline"} className="h-auto min-h-11 whitespace-normal text-xs" disabled={!creatorId || !status || busy || full || status.entry?.pass_type === pass} onClick={() => void save("join", pass)}>{pass === "PRO_PASS" ? "PRO · $1,500" : "ELITE · $3,500"}{status?.entry?.pass_type === pass ? " · SELECTED" : status?.entry ? " · SWITCH" : " · JOIN FREE"}</Button>)}
    </div>
    <p className="text-xs text-muted-foreground">No charge now. No VIP benefits until purchase and verified payment. Switching Pro/Elite keeps your position; leaving gives up your place. Positions may move forward when others leave.</p>
    {status?.entry && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void save("leave")}>LEAVE WAITING LIST</Button>}
    {error && <><p role="alert" className="text-xs text-destructive">{error}</p><Button variant="outline" size="sm" disabled={busy} onClick={() => void save("status")}>RETRY</Button></>}
    {!status && !error && <p role="status" className="text-xs text-muted-foreground">Loading waiting-list availability…</p>}
    {busy && <p role="status" className="text-xs text-muted-foreground">Saving your choice…</p>}
  </section>;
}
