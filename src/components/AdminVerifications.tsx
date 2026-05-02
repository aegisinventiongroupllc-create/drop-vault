import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, RefreshCw, ShieldCheck, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface VerificationRow {
  id: string;
  user_id: string;
  legal_first_name: string;
  legal_last_name: string;
  date_of_birth: string;
  id_front_path: string;
  id_back_path: string;
  selfie_path: string;
  status: string;
  reviewer_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  email?: string | null;
  display_name?: string | null;
}

const StatusFilter = ["pending", "approved", "rejected", "all"] as const;
type Filter = typeof StatusFilter[number];

const AdminVerifications = () => {
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>("pending");
  const [open, setOpen] = useState<VerificationRow | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("creator_verifications")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) {
      toast({ title: "Failed to load verifications", description: error.message });
      setLoading(false);
      return;
    }
    const userIds = Array.from(new Set((data || []).map((r) => r.user_id)));
    let profMap: Record<string, { email: string | null; display_name: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .in("user_id", userIds);
      profs?.forEach((p) => { profMap[p.user_id] = { email: p.email, display_name: p.display_name }; });
    }
    setRows((data || []).map((r) => ({ ...r, email: profMap[r.user_id]?.email, display_name: profMap[r.user_id]?.display_name })));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const openReview = async (row: VerificationRow) => {
    setOpen(row);
    setNotes(row.reviewer_notes ?? "");
    setSignedUrls({});
    const paths = [row.id_front_path, row.id_back_path, row.selfie_path];
    const { data, error } = await supabase.storage.from("id-verifications").createSignedUrls(paths, 60 * 30);
    if (error || !data) {
      toast({ title: "Couldn't load images", description: error?.message });
      return;
    }
    const map: Record<string, string> = {};
    data.forEach((d, i) => { if (d.signedUrl) map[paths[i]] = d.signedUrl; });
    setSignedUrls(map);
  };

  const decide = async (status: "approved" | "rejected") => {
    if (!open) return;
    if (status === "rejected" && !notes.trim()) {
      toast({ title: "Reason required", description: "Add a note so the creator knows what to fix." });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("creator_verifications").update({
      status,
      reviewer_notes: notes.trim() || null,
      reviewer_id: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", open.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message });
      return;
    }
    toast({ title: status === "approved" ? "Creator approved ✓" : "Creator rejected" });
    setOpen(null);
    load();
  };

  const counts = {
    pending: rows.filter((r) => r.status === "pending").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold tracking-wider text-foreground">CREATOR ID VERIFICATIONS</h2>
        </div>
        <div className="flex gap-2">
          {StatusFilter.map((f) => (
            <Button key={f} variant={filter === f ? "neon" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {f.toUpperCase()}{f === "pending" && counts.pending ? ` (${counts.pending})` : ""}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No {filter === "all" ? "" : filter + " "}submissions.</Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-bold text-foreground">{r.legal_first_name} {r.legal_last_name}</p>
                <p className="text-xs text-muted-foreground truncate">{r.email || r.display_name || r.user_id}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  DOB {r.date_of_birth} · Submitted {new Date(r.submitted_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold tracking-wider ${
                  r.status === "approved" ? "bg-green-500/20 text-green-400" :
                  r.status === "rejected" ? "bg-destructive/20 text-destructive" :
                  "bg-gold/20 text-gold"
                }`}>
                  {r.status === "pending" ? <Clock className="w-3 h-3 inline mr-1" /> : null}
                  {r.status.toUpperCase()}
                </span>
                <Button size="sm" variant="outline" onClick={() => openReview(r)}>Review</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md p-4 overflow-y-auto" onClick={() => setOpen(null)}>
          <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-5 my-8 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">{open.legal_first_name} {open.legal_last_name}</h3>
                <p className="text-xs text-muted-foreground">{open.email}</p>
                <p className="text-xs text-muted-foreground">DOB: {open.date_of_birth}</p>
              </div>
              <button onClick={() => setOpen(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: "ID — FRONT", path: open.id_front_path },
                { label: "ID — BACK", path: open.id_back_path },
                { label: "SELFIE", path: open.selfie_path },
              ].map((s) => (
                <div key={s.label} className="space-y-1">
                  <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{s.label}</p>
                  {signedUrls[s.path] ? (
                    <a href={signedUrls[s.path]} target="_blank" rel="noreferrer">
                      <img src={signedUrls[s.path]} alt={s.label} className="w-full rounded-lg border border-border bg-black object-contain max-h-72" />
                    </a>
                  ) : (
                    <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-wider text-muted-foreground">REVIEWER NOTES (required to reject)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. ID photo blurry, retake in better lighting…"
                className="w-full mt-1 bg-secondary rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled={saving} onClick={() => decide("rejected")}>
                <XCircle className="w-4 h-4 mr-2" /> REJECT
              </Button>
              <Button variant="neon" className="flex-1" disabled={saving} onClick={() => decide("approved")}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />} APPROVE
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVerifications;