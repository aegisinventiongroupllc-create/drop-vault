import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Saved = {
  method: string; account_holder: string | null; bank_name: string | null;
  routing_last4: string | null; account_last4: string | null; account_type: string | null; ltc_address: string | null;
};

const CreatorPayoutMethod = () => {
  const [method, setMethod] = useState<"ach" | "ltc">("ach");
  const [holder, setHolder] = useState("");
  const [bank, setBank] = useState("");
  const [routing, setRouting] = useState("");
  const [account, setAccount] = useState("");
  const [account2, setAccount2] = useState("");
  const [type, setType] = useState<"checking" | "savings">("checking");
  const [ltc, setLtc] = useState("");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.rpc("get_my_payout_method");
    const row = (data as Saved[] | null)?.[0] ?? null;
    setSaved(row);
    if (row) setMethod(row.method as "ach" | "ltc");
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (method === "ach" && account !== account2) { toast.error("Account numbers don't match"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("set_my_payout_method", {
      _method: method, _account_holder: holder, _bank_name: bank, _routing: routing.trim(),
      _account: account.trim(), _account_type: type, _ltc: ltc.trim(),
    });
    setBusy(false);
    if (error) { toast.error(error.message.replace(/^.*?:\s*/, "") || "Could not save"); return; }
    toast.success("Payout method saved");
    setRouting(""); setAccount(""); setAccount2("");
    load();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div>
        <h3 className="text-base font-bold text-foreground tracking-wide">HOW YOU GET PAID</h3>
        <p className="text-xs text-muted-foreground">Choose bank transfer (ACH) or Litecoin. Only you and the DTT admin can see these details.</p>
      </div>

      {(() => {
        const d = new Date(); const add = (5 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + add);
        const friday = d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
        const isLtc = (saved?.method ?? method) === "ltc";
        return (
          <div className="rounded-lg border border-primary/40 bg-primary/10 p-3">
            <p className="text-xs font-bold tracking-wide text-primary">NEXT PAYOUT: {friday.toUpperCase()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isLtc
                ? "Litecoin: sent every Friday and usually arrives within minutes."
                : "Bank transfer: sent every Friday and usually arrives in 1–2 business days. Switch to Litecoin for faster payouts."}
            </p>
          </div>
        );
      })()}

      {saved && (
        <div className="bg-secondary/50 rounded-lg p-3 text-xs text-foreground">
          <p className="font-bold">Saved: {saved.method === "ach" ? "BANK TRANSFER" : "LITECOIN"}</p>
          {saved.method === "ach" ? (
            <p className="text-muted-foreground">{saved.account_holder} · {saved.bank_name || "Bank"} · {saved.account_type} ••••{saved.account_last4} · routing ••••{saved.routing_last4}</p>
          ) : (
            <p className="text-muted-foreground font-mono break-all">{saved.ltc_address}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {(["ach", "ltc"] as const).map((m) => (
          <Button key={m} type="button" variant={method === m ? "default" : "outline"} onClick={() => setMethod(m)}>
            {m === "ach" ? "BANK TRANSFER" : "LITECOIN"}
          </Button>
        ))}
      </div>

      {method === "ach" ? (
        <div className="space-y-2">
          <Input placeholder="Account holder name" value={holder} onChange={(e) => setHolder(e.target.value)} maxLength={120} />
          <Input placeholder="Bank name" value={bank} onChange={(e) => setBank(e.target.value)} maxLength={120} />
          <Input placeholder="Routing number (9 digits)" inputMode="numeric" value={routing} onChange={(e) => setRouting(e.target.value.replace(/\D/g, "").slice(0, 9))} />
          <Input placeholder="Account number" inputMode="numeric" type="password" autoComplete="off" value={account} onChange={(e) => setAccount(e.target.value.replace(/\D/g, "").slice(0, 17))} />
          <Input placeholder="Confirm account number" inputMode="numeric" autoComplete="off" value={account2} onChange={(e) => setAccount2(e.target.value.replace(/\D/g, "").slice(0, 17))} />
          <div className="grid grid-cols-2 gap-2">
            {(["checking", "savings"] as const).map((t) => (
              <Button key={t} type="button" size="sm" variant={type === t ? "secondary" : "outline"} onClick={() => setType(t)}>{t.toUpperCase()}</Button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">US bank accounts only. Find these numbers at the bottom of a check or in your banking app.</p>
        </div>
      ) : (
        <Input placeholder="LTC address (ltc1..., L..., M...)" className="font-mono text-xs" value={ltc} onChange={(e) => setLtc(e.target.value.trim())} />
      )}

      <Button variant="neon" className="w-full" disabled={busy} onClick={save}>
        {busy ? "SAVING..." : "SAVE PAYOUT METHOD"}
      </Button>
      <p className="text-[10px] text-muted-foreground">You are responsible for reporting your own earnings for taxes.</p>
    </div>
  );
};

export default CreatorPayoutMethod;
