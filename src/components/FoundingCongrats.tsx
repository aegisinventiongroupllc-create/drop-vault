import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

/** One-time congratulations for a creator who holds a founding slot. Seen-state is per account. */
const FoundingCongrats = ({ userId }: { userId: string }) => {
  const [slot, setSlot] = useState<{ slot: number; country: string; vault_side: string; split_creator: number; split_platform: number; ends_at: string } | null>(null);
  const key = `dtt-founding-congrats:${userId}`;
  useEffect(() => {
    if (localStorage.getItem(key)) return;
    void supabase.from("founding_creators").select("slot,country,vault_side,split_creator,split_platform,ends_at").eq("creator_id", userId).maybeSingle()
      .then(({ data }) => { if (data && new Date(data.ends_at) > new Date()) setSlot(data); });
  }, [userId, key]);
  if (!slot) return null;
  const close = () => { localStorage.setItem(key, "1"); setSlot(null); };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 p-4" role="dialog" aria-modal="true" aria-labelledby="founding-congrats-title">
      <div className="w-full max-w-sm rounded-2xl border border-gold bg-card p-6 text-center shadow-2xl space-y-3">
        <p className="text-4xl" aria-hidden>🏆</p>
        <h2 id="founding-congrats-title" className="text-xl font-bold text-gold">CONGRATULATIONS!</h2>
        <p className="text-sm text-foreground">
          You are founding {slot.vault_side === "men" ? "man" : "woman"} creator #{slot.slot} in {slot.country}.
        </p>
        <p className="text-sm text-muted-foreground">
          You keep {slot.split_creator}/{slot.split_platform} until {new Date(slot.ends_at).toLocaleDateString(undefined, { dateStyle: "medium" })}, then 90/10.
        </p>
        <Button variant="gold" className="w-full" onClick={close}>LET'S GO</Button>
      </div>
    </div>
  );
};
export default FoundingCongrats;
