import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCreatorText } from "@/i18n/creator";

type Saved = {
  method: string; account_holder: string | null; bank_name: string | null;
  routing_last4: string | null; account_last4: string | null; account_type: string | null; ltc_address: string | null;
};

const CreatorPayoutMethod = () => {
  const ct = useCreatorText();
  const [ltc, setLtc] = useState("");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.rpc("get_my_payout_method");
    const row = (data as Saved[] | null)?.[0] ?? null;
    setSaved(row);
    if (row?.method === "ltc") setLtc(row.ltc_address ?? "");
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("set_my_payout_method", {
      _method: "ltc", _account_holder: "", _bank_name: "", _routing: "",
      _account: "", _account_type: "", _ltc: ltc.trim(),
    });
    setBusy(false);
    if (error) { toast.error(error.message.replace(/^.*?:\s*/, "") || ct.save_fail); return; }
    toast.success(ct.saved_toast);
    load();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div>
        <h3 className="text-base font-bold text-foreground tracking-wide">{ct.how_paid}</h3>
        <p className="text-xs text-muted-foreground">Creator payouts are sent manually in Litecoin (LTC) only. Bank transfers are not offered.</p>
      </div>

      {saved?.method === "ltc" && (
        <div className="bg-secondary/50 rounded-lg p-3 text-xs text-foreground">
          <p className="font-bold">{ct.saved}: {ct.litecoin}</p>
            <p className="text-muted-foreground font-mono break-all">{saved.ltc_address}</p>
        </div>
      )}

      <Input aria-label="Litecoin payout address" placeholder={ct.ltc_ph} className="font-mono text-xs" value={ltc} onChange={(e) => setLtc(e.target.value.trim())} />

      <Button variant="neon" className="w-full" disabled={busy} onClick={save}>
        {busy ? ct.saving : ct.save_payout}
      </Button>
      <p className="text-[10px] text-muted-foreground">{ct.tax_note}</p>
    </div>
  );
};

export default CreatorPayoutMethod;
