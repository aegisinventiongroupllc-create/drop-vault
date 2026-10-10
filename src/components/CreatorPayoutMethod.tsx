import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCreatorText, creatorText } from "@/i18n/creator";

type Saved = {
  method: string; account_holder: string | null; bank_name: string | null;
  routing_last4: string | null; account_last4: string | null; account_type: string | null; ltc_address: string | null;
};

const CreatorPayoutMethod = () => {
  const [method, setMethod] = useState<"ach" | "ltc">("ach");
  const ct = useCreatorText();
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
    if (method === "ach" && account !== account2) { toast.error(ct.mismatch); return; }
    setBusy(true);
    const { error } = await supabase.rpc("set_my_payout_method", {
      _method: method, _account_holder: holder, _bank_name: bank, _routing: routing.trim(),
      _account: account.trim(), _account_type: type, _ltc: ltc.trim(),
    });
    setBusy(false);
    if (error) { toast.error(error.message.replace(/^.*?:\s*/, "") || ct.save_fail); return; }
    toast.success(ct.saved_toast);
    setRouting(""); setAccount(""); setAccount2("");
    load();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div>
        <h3 className="text-base font-bold text-foreground tracking-wide">{ct.how_paid}</h3>
        <p className="text-xs text-muted-foreground">{ct.how_paid_sub}</p>
      </div>

      {(() => {
        const d = new Date(); const add = (5 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + add);
        const friday = d.toLocaleDateString(ct === creatorText.es ? "es-MX" : undefined, { weekday: "long", month: "short", day: "numeric" });
        const isLtc = (saved?.method ?? method) === "ltc";
        return (
          <div className="rounded-lg border border-primary/40 bg-primary/10 p-3">
            <p className="text-xs font-bold tracking-wide text-primary">{ct.next_payout}: {friday.toUpperCase()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isLtc
                ? ct.ltc_timing
                : ct.ach_timing}
            </p>
          </div>
        );
      })()}

      {saved && (
        <div className="bg-secondary/50 rounded-lg p-3 text-xs text-foreground">
          <p className="font-bold">{ct.saved}: {saved.method === "ach" ? ct.bank_transfer : ct.litecoin}</p>
          {saved.method === "ach" ? (
            <p className="text-muted-foreground">{saved.account_holder} · {saved.bank_name || ct.bank} · {saved.account_type} ••••{saved.account_last4} · {ct.routing} ••••{saved.routing_last4}</p>
          ) : (
            <p className="text-muted-foreground font-mono break-all">{saved.ltc_address}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {(["ach", "ltc"] as const).map((m) => (
          <Button key={m} type="button" variant={method === m ? "default" : "outline"} onClick={() => setMethod(m)}>
            {m === "ach" ? ct.bank_transfer : ct.litecoin}
          </Button>
        ))}
      </div>

      {method === "ach" ? (
        <div className="space-y-2">
          <Input placeholder={ct.holder_ph} value={holder} onChange={(e) => setHolder(e.target.value)} maxLength={120} />
          <Input placeholder={ct.bank_ph} value={bank} onChange={(e) => setBank(e.target.value)} maxLength={120} />
          <Input placeholder={ct.routing_ph} inputMode="numeric" value={routing} onChange={(e) => setRouting(e.target.value.replace(/\D/g, "").slice(0, 9))} />
          <Input placeholder={ct.account_ph} inputMode="numeric" type="password" autoComplete="off" value={account} onChange={(e) => setAccount(e.target.value.replace(/\D/g, "").slice(0, 17))} />
          <Input placeholder={ct.account2_ph} inputMode="numeric" autoComplete="off" value={account2} onChange={(e) => setAccount2(e.target.value.replace(/\D/g, "").slice(0, 17))} />
          <div className="grid grid-cols-2 gap-2">
            {(["checking", "savings"] as const).map((t) => (
              <Button key={t} type="button" size="sm" variant={type === t ? "secondary" : "outline"} onClick={() => setType(t)}>{t === "checking" ? ct.checking : ct.savings}</Button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">{ct.us_only}</p>
        </div>
      ) : (
        <Input placeholder={ct.ltc_ph} className="font-mono text-xs" value={ltc} onChange={(e) => setLtc(e.target.value.trim())} />
      )}

      <Button variant="neon" className="w-full" disabled={busy} onClick={save}>
        {busy ? ct.saving : ct.save_payout}
      </Button>
      <p className="text-[10px] text-muted-foreground">{ct.tax_note}</p>
    </div>
  );
};

export default CreatorPayoutMethod;
