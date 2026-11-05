import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

type Kind = "withdraw" | "delete_account";
type Status = { kind: Kind; status: string; account_deletion_status: string; requested_at: string } | null;

const CreatorConsentWithdrawal = () => {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("withdraw");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<Status>(null);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase.from("creator_consent_withdrawals")
      .select("kind,status,account_deletion_status,requested_at").eq("creator_id", u.user.id).maybeSingle();
    setCurrent((data as Status) ?? null);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("creator-withdraw", { body: { kind, reason: reason.trim() || undefined, confirm } });
    setBusy(false);
    if (error || !data?.success) { toast({ title: "Request not completed", description: "Please try again or contact admin@dttmediallc.com." }); return; }
    toast({ title: "Consent withdrawn", description: "Your media is no longer available to customers." });
    setOpen(false); setConfirm("");
    if (kind === "delete_account") { await supabase.auth.signOut(); window.location.assign("/"); return; }
    load();
  };

  return (
    <div className="mt-6 rounded-xl border border-destructive/40 bg-card p-4 space-y-3">
      <h3 className="text-base font-bold uppercase tracking-wider text-foreground">WITHDRAW CONSENT / DELETE ACCOUNT</h3>
      {current ? (
        <p className="text-xs text-muted-foreground">
          Consent withdrawn on {new Date(current.requested_at).toLocaleDateString()}. Your media is unavailable to customers.
          {current.account_deletion_status === "pending_admin" && " Account deletion is pending administrator completion."}
        </p>
      ) : !open ? (
        <>
          <p className="text-xs text-muted-foreground">Remove all your photos and videos from DTT immediately. Legally required identity and § 2257 records are kept in a secure archive.</p>
          <Button variant="destructive" onClick={() => setOpen(true)}>WITHDRAW CONSENT</Button>
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button variant={kind === "withdraw" ? "destructive" : "outline"} onClick={() => setKind("withdraw")}>REMOVE MEDIA ONLY</Button>
            <Button variant={kind === "delete_account" ? "destructive" : "outline"} onClick={() => setKind("delete_account")}>REMOVE & DELETE ACCOUNT</Button>
          </div>
          <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
            <li>All your teasers and videos stop playing for customers right away, including permanent purchases.</li>
            <li>Video copies on our streaming provider are deleted.</li>
            <li>Identity, consent and § 2257 records are retained as the law requires and cannot be erased.</li>
            <li>This cannot be undone from your dashboard.</li>
          </ul>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder="Reason (optional)" />
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value.toUpperCase())} placeholder='Type WITHDRAW to confirm' />
          <div className="flex gap-2">
            <Button variant="destructive" disabled={busy || confirm !== "WITHDRAW"} onClick={submit}>{busy ? "PLEASE WAIT…" : "CONFIRM"}</Button>
            <Button variant="outline" onClick={() => setOpen(false)}>CANCEL</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorConsentWithdrawal;
