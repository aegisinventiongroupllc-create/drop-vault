import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const VIP_PASSES = [
  { id: "PRO_PASS", name: "PRO PASS", price: 1500, perks: ["Permanent 92/8 split on all 14-day vault unlocks", "Skips the 100k follower requirement"] },
  { id: "ELITE_PASS", name: "ELITE PASS", price: 3500, perks: ["Permanent 92/8 split on vault unlocks", "90/10 split on Request Room tips", "Verified VIP badge on your profile", "Priority discovery placement for 30 days"] },
] as const;

export function passesRemaining(cap: number, sold: number) {
  return Math.max(0, cap - sold);
}

export default function LifetimeUpgradeStore({ creatorId }: { creatorId?: string | null }) {
  const [inv, setInv] = useState<{ cap: number; sold: number } | null>(null);
  const [owned, setOwned] = useState<string>("NONE");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setInv(null); setOwned("NONE"); setFailed(false);
    if (!creatorId) return;
    const load = async () => {
      const [inventory, settings] = await Promise.all([
        supabase.from("vip_pass_inventory").select("total_passes_cap, passes_sold").maybeSingle(),
        supabase.from("creator_split_settings").select("vip_pass_purchased").eq("creator_id", creatorId).maybeSingle(),
      ]);
      if (cancelled) return;
      setFailed(!!inventory.error || !inventory.data);
      if (inventory.data) setInv({ cap: inventory.data.total_passes_cap, sold: inventory.data.passes_sold });
      setOwned(settings.data?.vip_pass_purchased ?? "NONE");
    };
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [creatorId]);

  const left = inv ? passesRemaining(inv.cap, inv.sold) : null;
  const soldOut = left === 0;

  return (
    <section className="border-y border-gold/40 py-5 space-y-3" aria-label="Lifetime upgrade store">
      <h3 className="font-display text-sm font-bold tracking-wider text-gold">LIFETIME UPGRADE STORE</h3>
      <p className="text-xs font-bold text-primary">
        Limited Availability: {left === null ? "—" : left.toLocaleString()} / {(inv?.cap ?? 1000).toLocaleString()} Lifetime VIP Passes Remaining
      </p>
      {failed && <p role="status" className="text-xs text-muted-foreground">Availability unavailable. Purchases remain closed.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {VIP_PASSES.map((p) => (
          <div key={p.id} className="rounded-lg border border-border bg-background/60 p-3 space-y-2">
            <div className="flex flex-wrap gap-2 items-baseline justify-between">
              <span className="font-display font-bold tracking-wider text-foreground">{p.name}</span>
              <span className="text-gold font-bold">${p.price.toLocaleString()}</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">{p.perks.map((x) => <li key={x}>• {x}</li>)}</ul>
            <Button variant="gold" className="w-full" disabled>
              {owned === p.id ? "OWNED" : soldOut ? "SOLD OUT" : "COMING SOON"}
            </Button>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">One-time buy-in. Purchases open once DTT's payment provider is approved.</p>
    </section>
  );
}
