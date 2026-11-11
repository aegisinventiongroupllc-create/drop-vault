import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import VipCheckoutDialog, { vipFunctionError } from "@/components/VipCheckoutDialog";
import { vipRemaining } from "../../supabase/functions/_shared/vipPayment";

export const VIP_PASSES = [
  { id: "PRO_PASS", name: "PRO PASS", price: 1500, perks: ["92/8 split forever on all 14-day vault unlocks", "No follower goal needed"] },
  { id: "ELITE_PASS", name: "ELITE PASS", price: 3500, perks: ["93/7 split for life on vault unlocks", "90/10 split on Request Room tips", "Verified VIP badge on your profile", "Priority discovery placement for 30 days"] },
] as const;

/** Next founder's-birthday batch: May 1, 00:00 New York time. */
export function nextVipBatch(now = new Date()) {
  const year = now.getUTCFullYear();
  const at = (y: number) => { const d = new Date(Date.UTC(y, 4, 1, 4)); return d; }; // 00:00 EDT = 04:00 UTC
  return now < at(year) ? at(year) : at(year + 1);
}

export function passesRemaining(cap: number, sold: number) {
  return vipRemaining(cap, sold);
}

export default function LifetimeUpgradeStore({ creatorId }: { creatorId?: string | null }) {
  const [inv, setInv] = useState<{ cap: number; remaining: number } | null>(null);
  const [owned, setOwned] = useState<string>("NONE");
  const [failed, setFailed] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [checkout, setCheckout] = useState<{ pass_type: string; invoice_url?: string; expires_at: string } | null>(null);
  const [selected, setSelected] = useState<typeof VIP_PASSES[number] | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setInv(null); setOwned("NONE"); setFailed(false); setCheckout(null); setEnabled(false); setError(""); setSelected(null);
    if (!creatorId) return;
    const load = async () => {
      setChecking(true);
      try {
        const result = await supabase.functions.invoke("vip-checkout", { body: { action: "status" } });
        if (result.error) throw new Error(await vipFunctionError(result.error));
        if (!result.data || result.data.cap == null) throw new Error("Availability unavailable.");
        if (cancelled) return;
        setFailed(false); setError("");
        setInv({ cap: result.data.cap, remaining: result.data.remaining });
        setOwned(result.data.owned); setCheckout(result.data.checkout); setEnabled(result.data.enabled === true);
      } catch (e) { if (!cancelled) { setFailed(true); setError(e instanceof Error ? e.message : "Availability unavailable."); } }
      finally { if (!cancelled) setChecking(false); }
    };
    void load();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [creatorId, refresh]);

  const left = inv?.remaining ?? null;
  const soldOut = left === 0;

  return (
    <section className="border-y border-gold/40 py-5 space-y-3" aria-label="Lifetime upgrade store">
      <h3 className="font-display text-sm font-bold tracking-wider text-gold">LIFETIME UPGRADE STORE</h3>
      <p className="text-xs font-bold text-primary">
        Limited Availability: {left === null ? "—" : left.toLocaleString()} / {(inv?.cap ?? 1000).toLocaleString()} Lifetime VIP Passes Remaining
      </p>
      {failed && <p role="alert" className="text-xs text-destructive">{error} New purchases are paused.</p>}
      {owned !== "NONE" && <p role="status" className="text-sm text-gold">Payment confirmed · {owned === "PRO_PASS" ? "Pro Pass" : "Elite Pass"} active.</p>}
      {checkout && <div className="space-y-2 border-l-2 border-gold pl-3">
        <p role="status" className="text-sm text-foreground">{checkout.invoice_url ? "Awaiting verified payment · your pass is reserved." : "Checkout is being prepared · your pass is reserved."}</p>
        {checkout.invoice_url && <a className="text-sm text-primary underline" href={checkout.invoice_url} target="_blank" rel="noopener noreferrer">OPEN TRYBIT CHECKOUT</a>}
        <p className="text-xs text-muted-foreground">Pay only through this invoice. DTT checks payment before activating your pass.</p>
      </div>}
      {soldOut && !checkout && owned === "NONE" && <p role="status" className="text-sm text-foreground">VIP passes are sold out or reserved. No payment can be started.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {VIP_PASSES.map((p) => (
          <div key={p.id} className="rounded-lg border border-border bg-background/60 p-3 space-y-2">
            <div className="flex flex-wrap gap-2 items-baseline justify-between">
              <span className="font-display font-bold tracking-wider text-foreground">{p.name}</span>
              <span className="text-gold font-bold">${p.price.toLocaleString()}</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">{p.perks.map((x) => <li key={x}>• {x}</li>)}</ul>
            <Button variant="gold" className="w-full" disabled={!creatorId || failed || left === null || !enabled || owned !== "NONE" || !!checkout || soldOut} onClick={() => setSelected(p)}>
              {owned === p.id ? "OWNED" : owned !== "NONE" ? "PASS ALREADY OWNED" : checkout ? "CHECKOUT IN PROGRESS" : soldOut ? "SOLD OUT" : !enabled ? "CHECKOUT UNAVAILABLE" : `BUY ${p.name}`}
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs font-semibold text-gold">🎂 New VIP pass batch every year on the founder's birthday — May 1 at midnight (New York time). Next batch: {nextVipBatch().toLocaleDateString(undefined, { dateStyle: "long" })}.</p>
      <p className="text-[10px] text-muted-foreground">1,000 worldwide across Pro and Elite combined. First come, first served. Pending invoices reserve a place; unpaid expiry must be confirmed by TryBit.</p>
      <Button variant="outline" size="sm" disabled={checking} onClick={() => setRefresh(n => n + 1)}>{checking ? "CHECKING…" : "CHECK PAYMENT & AVAILABILITY"}</Button>
      {selected && <VipCheckoutDialog pass={selected} onClose={() => setSelected(null)} onCreated={() => { setSelected(null); setRefresh(n => n + 1); }} />}
    </section>
  );
}
