import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

type Withdrawal = { id: string; creator_id: string; kind: string; status: string; media_count: number; provider_removed: number; provider_failed: number; account_deletion_status: string; requested_at: string };
type Check = { id: string; newest_backup_at: string; export_downloaded: boolean; storage_downloaded: boolean; notes: string | null; created_at: string };
type Policy = { category: string; retention: string; basis: string };

const AdminRetentionBackups = () => {
  const [w, setW] = useState<Withdrawal[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [newest, setNewest] = useState("");
  const [exp, setExp] = useState(false);
  const [sto, setSto] = useState(false);
  const [notes, setNotes] = useState("");

  const load = async () => {
    const [a, b, c] = await Promise.all([
      supabase.from("creator_consent_withdrawals").select("*").order("requested_at", { ascending: false }).limit(50),
      supabase.from("backup_verification_checks").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("data_retention_policies").select("category,retention,basis"),
    ]);
    setW((a.data as Withdrawal[]) ?? []); setChecks((b.data as Check[]) ?? []); setPolicies((c.data as Policy[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const record = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user || !newest) return;
    const { error } = await supabase.from("backup_verification_checks").insert({
      checked_by: u.user.id, newest_backup_at: new Date(newest + "Z").toISOString(), export_downloaded: exp, storage_downloaded: sto, notes: notes.trim() || null,
    });
    if (error) { toast({ title: "Could not save check" }); return; }
    setNewest(""); setNotes(""); setExp(false); setSto(false); load();
  };

  const last = checks[0];
  const ageH = last ? (Date.now() - new Date(last.newest_backup_at).getTime()) / 36e5 : null;

  return (
    <div className="px-4 space-y-4">
      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">SYSTEM BACKUPS</h3>
        <p className="text-xs text-muted-foreground">Automatic daily database backups (accounts, transactions, upload records), kept about 14 days. No point-in-time recovery. Photo/video files are not included — download them separately.</p>
        <p className="text-xs text-foreground">
          {last ? <>Last verified backup: {new Date(last.newest_backup_at).toUTCString()} · {ageH! <= 30 ? "HEALTHY" : "OVERDUE — CHECK BACKUPS PAGE"}</> : "No backup check recorded yet."}
        </p>
        <p className="text-[11px] text-muted-foreground">Check: More → Database → Manage → Backups. Enter the newest UTC timestamp shown.</p>
        <div className="grid gap-2">
          <Input type="datetime-local" value={newest} onChange={(e) => setNewest(e.target.value)} aria-label="Newest backup (UTC)" />
          <label className="text-xs flex gap-2 items-center"><input type="checkbox" checked={exp} onChange={(e) => setExp(e.target.checked)} /> Full database export downloaded</label>
          <label className="text-xs flex gap-2 items-center"><input type="checkbox" checked={sto} onChange={(e) => setSto(e.target.checked)} /> Storage files downloaded</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Notes" />
          <Button onClick={record} disabled={!newest}>RECORD BACKUP CHECK</Button>
        </div>
        {checks.slice(1).map((c) => (
          <p key={c.id} className="text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}: backup {new Date(c.newest_backup_at).toUTCString()}{c.export_downloaded ? " · export" : ""}{c.storage_downloaded ? " · files" : ""}</p>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">RETENTION RULES</h3>
        {policies.map((p) => (
          <p key={p.category} className="text-xs"><span className="font-semibold text-foreground">{p.category}:</span> <span className="text-muted-foreground">{p.retention} — {p.basis}</span></p>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">CONSENT WITHDRAWAL LOG</h3>
        {!w.length && <p className="text-xs text-muted-foreground">No withdrawals.</p>}
        {w.map((r) => (
          <div key={r.id} className="rounded border border-border p-2 text-xs space-y-0.5">
            <p className="text-foreground font-semibold">{new Date(r.requested_at).toUTCString()} · {r.kind === "delete_account" ? "DELETE ACCOUNT" : "WITHDRAW"} · {r.status.toUpperCase()}</p>
            <p className="text-muted-foreground break-all">Creator {r.creator_id}</p>
            <p className="text-muted-foreground">Media {r.media_count} · stream copies removed {r.provider_removed} · failed {r.provider_failed} · account deletion {r.account_deletion_status}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminRetentionBackups;
