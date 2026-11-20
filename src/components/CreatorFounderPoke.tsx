import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";

type Receipt = { received_at: string | null; day: string; days: number; next_day_at: string };
export default function CreatorFounderPoke({ creatorId }: { creatorId: string }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setReceipt(null); setError("");
    const load = async () => {
      const result = await supabase.rpc("my_founder_poke", { _send: false });
      if (!active) return;
      if (result.error) setError("Your daily poke could not be loaded. Please retry.");
      else { setReceipt(result.data as unknown as Receipt); setError(""); }
    };
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60000);
    window.addEventListener("focus", load);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", load); };
  }, [creatorId]);
  const send = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await supabase.rpc("my_founder_poke", { _send: true });
      if (result.error) setError("Your poke was not confirmed. Please retry.");
      else setReceipt(result.data as unknown as Receipt);
    } catch { setError("Your poke was not confirmed. Please retry."); }
    finally { setBusy(false); }
  };
  const received = Boolean(receipt?.received_at);
  return <section aria-label="Daily founder poke" className="mx-4 mb-4 border-y border-primary/30 py-3 space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-sm font-semibold text-foreground">A little nudge for DTT’s founder</h2>
        <p className="text-xs text-muted-foreground">{receipt ? `${receipt.days} / 365 daily check-ins` : "Daily creator check-in"}</p></div>
      <Button variant={received ? "outline" : "neon"} disabled={busy || received} onClick={() => void send()} className="h-auto min-h-10 whitespace-normal">
        {busy ? "SENDING…" : received ? "POKE RECEIVED 😉" : "POKE THE FOUNDER TO GET NOTICED"}
      </Button>
    </div>
    <p className="text-xs text-muted-foreground">Creator tip: check in once each New York day. Consistent participation appears in the founder’s private yearly review—not an automatic percentage increase.</p>
    {received && <p role="status" className="text-xs text-primary">Your poke is saved for the founder’s review 😉 Next check-in: midnight in New York.</p>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </section>;
}