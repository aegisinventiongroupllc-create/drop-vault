import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, DollarSign, Wallet, RefreshCw, Copy, Trash2, Check, LogOut, FileVideo, ShieldCheck, Search, Home, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import AdminVerifications from "@/components/AdminVerifications";

const SESSION_KEY = "dtt_secret_admin_ok";

interface WalletRow {
  user_id: string;
  ltc_address: string | null;
  pending_balance: number;
  display_name: string | null;
  email: string | null;
}

interface MediaItem {
  bucket: "vault" | "teasers";
  name: string;
  size: number;
  created_at: string;
  publicUrl?: string;
}

interface LegalConsent {
  id: string;
  email: string | null;
  username: string | null;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  consent_type: string;
  consent_text: string;
  terms_version: string;
  created_at: string;
}

interface ActivityRow {
  id: string;
  user_id: string;
  user_role: string;
  action_type: string;
  action_detail: string | null;
  metadata: any;
  activity_date: string;
  created_at: string;
  email?: string | null;
  display_name?: string | null;
}

interface Stats {
  totalCreators: number;
  totalRevenue: number;
  wallets: WalletRow[];
  media: MediaItem[];
}

const AdminPortal = () => {
  const navigate = useNavigate();
  const [authed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [consents, setConsents] = useState<LegalConsent[]>([]);
  const [consentsLoading, setConsentsLoading] = useState(false);
  const [consentSearch, setConsentSearch] = useState("");
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityRoleFilter, setActivityRoleFilter] = useState<"all" | "creator" | "customer">("all");
  const [activityDateFilter, setActivityDateFilter] = useState<string>(""); // YYYY-MM-DD

  useEffect(() => {
    if (!authed) {
      navigate("/052417", { replace: true });
    }
  }, [authed, navigate]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [{ count: totalCreators }, { data: txRows }, { data: walletRows }, vaultList, teaserList] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "creator"),
        supabase.from("transactions").select("amount_usd").eq("status", "completed"),
        supabase.from("creator_wallets").select("user_id, ltc_address, pending_balance"),
        supabase.storage.from("vault").list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } }),
        supabase.storage.from("teasers").list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } }),
      ]);

      const totalRevenue = (txRows ?? []).reduce((sum, t) => sum + (Number(t.amount_usd) || 0), 0);

      const userIds = (walletRows ?? []).map((w) => w.user_id);
      let profileMap: Record<string, { display_name: string | null; email: string | null }> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name, email")
          .in("user_id", userIds);
        profileMap = Object.fromEntries((profs ?? []).map((p) => [p.user_id, { display_name: p.display_name, email: p.email }]));
      }

      const media: MediaItem[] = [
        ...(vaultList.data ?? []).filter((f) => f.name && !f.name.startsWith(".")).map((f) => ({
          bucket: "vault" as const,
          name: f.name,
          size: (f.metadata as { size?: number })?.size ?? 0,
          created_at: f.created_at ?? "",
        })),
        ...(teaserList.data ?? []).filter((f) => f.name && !f.name.startsWith(".")).map((f) => {
          const { data: pub } = supabase.storage.from("teasers").getPublicUrl(f.name);
          return {
            bucket: "teasers" as const,
            name: f.name,
            size: (f.metadata as { size?: number })?.size ?? 0,
            created_at: f.created_at ?? "",
            publicUrl: pub.publicUrl,
          };
        }),
      ].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

      setStats({
        totalCreators: totalCreators ?? 0,
        totalRevenue,
        wallets: (walletRows ?? []).map((w) => ({
          user_id: w.user_id,
          ltc_address: w.ltc_address,
          pending_balance: Number(w.pending_balance) || 0,
          display_name: profileMap[w.user_id]?.display_name ?? null,
          email: profileMap[w.user_id]?.email ?? null,
        })),
        media,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authed) return;
    loadStats();
    loadConsents("");
    loadActivity();
    const channel = supabase
      .channel("admin-portal-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, loadStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "creator_wallets" }, loadStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, loadStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "legal_consents" }, () => loadConsents(consentSearch))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, () => loadActivity())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const loadActivity = async () => {
    setActivityLoading(true);
    try {
      let q = (supabase.from("activity_logs") as any)
        .select("id, user_id, user_role, action_type, action_detail, metadata, activity_date, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (activityRoleFilter !== "all") q = q.eq("user_role", activityRoleFilter);
      if (activityDateFilter) q = q.eq("activity_date", activityDateFilter);
      const { data: rows, error } = await q;
      if (error) throw error;
      const list = (rows ?? []) as ActivityRow[];

      const ids = Array.from(new Set(list.map((r) => r.user_id)));
      let pmap: Record<string, { email: string | null; display_name: string | null }> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, email, display_name")
          .in("user_id", ids);
        pmap = Object.fromEntries((profs ?? []).map((p) => [p.user_id, { email: p.email, display_name: p.display_name }]));
      }
      setActivity(list.map((r) => ({ ...r, email: pmap[r.user_id]?.email ?? null, display_name: pmap[r.user_id]?.display_name ?? null })));
    } catch (err) {
      toast({ title: "Failed to load activity", description: String(err), variant: "destructive" });
    } finally {
      setActivityLoading(false);
    }
  };

  // Reload when filters change
  useEffect(() => {
    if (authed) loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityRoleFilter, activityDateFilter, authed]);

  const exportActivityCsv = () => {
    const header = ["date", "time", "role", "user", "email", "action", "detail"];
    const rows = activity.map((r) => {
      const dt = new Date(r.created_at);
      return [
        r.activity_date,
        dt.toLocaleTimeString(),
        r.user_role,
        r.display_name ?? "",
        r.email ?? "",
        r.action_type,
        (r.action_detail ?? "").replace(/"/g, '""'),
      ];
    });
    const csv = [header, ...rows].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dtt-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadConsents = async (search: string) => {
    setConsentsLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/legal-logs${search ? `?search=${encodeURIComponent(search)}` : ""}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setConsents(Array.isArray(data) ? data : []);
    } catch (err) {
      toast({ title: "Failed to load consents", description: String(err), variant: "destructive" });
    } finally {
      setConsentsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      toast({ title: "Copy failed", description: "Please copy manually.", variant: "destructive" });
    }
  };

  const deleteMedia = async (bucket: "vault" | "teasers", name: string) => {
    if (!confirm(`Delete ${name} from ${bucket}? This cannot be undone.`)) return;
    const { error } = await supabase.storage.from(bucket).remove([name]);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: `${name} removed from ${bucket}.` });
      loadStats();
    }
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    navigate("/052417", { replace: true });
  };

  if (!authed) return null;

  return (
    <>
      <Helmet>
        <title>Admin Portal</title>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground p-4 pb-24">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-wider">ADMIN PORTAL</h1>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate("/")}>
                <Home className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={loadStats} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant="outline" onClick={logout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Platform Overview */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
                <Users className="w-4 h-4" /> Active Creators
              </div>
              <div className="text-3xl font-bold mt-2">{stats?.totalCreators ?? "—"}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
                <DollarSign className="w-4 h-4" /> Total Revenue
              </div>
              <div className="text-3xl font-bold mt-2 text-primary">
                ${stats ? stats.totalRevenue.toFixed(2) : "—"}
              </div>
            </Card>
          </div>

          {/* Creator ID Verifications */}
          <Card className="p-4">
            <AdminVerifications />
          </Card>

          {/* Payout Management */}
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-3">
              <Wallet className="w-4 h-4" /> Payout Management (LTC)
            </div>
            {!stats || stats.wallets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No creator wallets registered yet.</p>
            ) : (
              <div className="space-y-2">
                {stats.wallets.map((w) => (
                  <div key={w.user_id} className="border border-border rounded-md p-3 text-xs space-y-2">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold truncate">
                        {w.display_name || w.email || w.user_id.slice(0, 8)}
                      </span>
                      <span className="text-primary font-mono">${w.pending_balance.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono break-all flex-1 text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                        {w.ltc_address || <span className="italic">No LTC address set</span>}
                      </code>
                      {w.ltc_address && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 h-8 px-2"
                          onClick={() => copyToClipboard(w.ltc_address!, `ltc-${w.user_id}`)}
                        >
                          {copiedKey === `ltc-${w.user_id}` ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Content Moderation */}
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-3">
              <FileVideo className="w-4 h-4" /> Content Moderation
            </div>
            {!stats || stats.media.length === 0 ? (
              <p className="text-sm text-muted-foreground">No uploaded media yet.</p>
            ) : (
              <div className="space-y-2">
                {stats.media.map((m) => (
                  <div
                    key={`${m.bucket}-${m.name}`}
                    className="border border-border rounded-md p-3 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          m.bucket === "vault"
                            ? "bg-primary/20 text-primary"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {m.bucket}
                      </span>
                      <span className="text-muted-foreground">
                        {m.size ? `${(m.size / 1024 / 1024).toFixed(2)} MB` : ""}
                      </span>
                    </div>
                    <div className="font-mono break-all">{m.name}</div>
                    <div className="flex gap-2">
                      {m.publicUrl && (
                        <Button asChild size="sm" variant="outline" className="h-8 flex-1">
                          <a href={m.publicUrl} target="_blank" rel="noreferrer">
                            Preview
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 flex-1"
                        onClick={() => deleteMedia(m.bucket, m.name)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Legal Consent Audit Trail */}
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" /> Legal Consent Log
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={() => loadConsents(consentSearch)}
                disabled={consentsLoading}
              >
                {consentsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
              Immutable audit trail. Every record proves the user checked all required boxes (18+, ToS, Contractor) at the listed timestamp, with their IP &amp; device. Use this for legal defense.
            </p>

            <div className="relative mb-3">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                placeholder="Search by email or username..."
                value={consentSearch}
                onChange={(e) => setConsentSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadConsents(consentSearch)}
                className="h-8 pl-7 text-xs"
              />
            </div>

            {consentsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : consents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No consent records yet.</p>
            ) : (
              <div className="space-y-2">
                {consents.map((c) => {
                  const dt = new Date(c.created_at);
                  const checkedAge = c.consent_text.includes("[AGE]");
                  const checkedTos = c.consent_text.includes("[TOS]");
                  const checkedContractor = c.consent_text.includes("[CONTRACTOR]");
                  return (
                    <div key={c.id} className="border border-border rounded-md p-3 text-xs space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">
                            {c.email || c.username || (c.user_id ? c.user_id.slice(0, 8) : "Anonymous visitor")}
                          </div>
                          <div className="text-muted-foreground text-[10px] mt-0.5">
                            {dt.toLocaleDateString()} · {dt.toLocaleTimeString()}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/20 text-primary shrink-0">
                          v{c.terms_version}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${checkedAge ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                          {checkedAge ? "✓" : "✗"} 18+
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${checkedTos ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                          {checkedTos ? "✓" : "✗"} ToS
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${checkedContractor ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                          {checkedContractor ? "✓" : "✗"} Contractor
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground space-y-1 pt-1 border-t border-border/50">
                        <div><span className="font-semibold">IP:</span> <span className="font-mono">{c.ip_address || "unknown"}</span></div>
                        <div className="truncate"><span className="font-semibold">Device:</span> <span className="font-mono">{c.user_agent || "unknown"}</span></div>
                        <div><span className="font-semibold">Type:</span> {c.consent_type}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Daily Activity Log */}
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
                <Activity className="w-4 h-4" /> Daily Activity Log
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={exportActivityCsv} disabled={activity.length === 0}>
                  Export CSV
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2" onClick={loadActivity} disabled={activityLoading}>
                  {activityLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
              Append-only record of every creator and customer action — logins, uploads, token purchases, custom requests, password changes, payouts, and more. Filter by role or date.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <select
                value={activityRoleFilter}
                onChange={(e) => setActivityRoleFilter(e.target.value as any)}
                className="h-8 text-xs bg-secondary text-foreground border border-border rounded-md px-2"
              >
                <option value="all">All roles</option>
                <option value="creator">Creators only</option>
                <option value="customer">Customers only</option>
              </select>
              <Input
                type="date"
                value={activityDateFilter}
                onChange={(e) => setActivityDateFilter(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {activityLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded for this filter.</p>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto">
                {activity.map((r) => {
                  const dt = new Date(r.created_at);
                  return (
                    <div key={r.id} className="border border-border rounded-md p-2.5 text-xs space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">
                            {r.display_name || r.email || r.user_id.slice(0, 8)}
                          </div>
                          <div className="text-muted-foreground text-[10px]">
                            {r.activity_date} · {dt.toLocaleTimeString()}
                          </div>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                          r.user_role === "creator" ? "bg-primary/20 text-primary" : "bg-secondary text-secondary-foreground"
                        }`}>
                          {r.user_role}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-foreground/10 text-foreground">
                          {r.action_type.replace(/_/g, " ")}
                        </span>
                        {r.action_detail && (
                          <span className="text-muted-foreground text-[10px] truncate">{r.action_detail}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <p className="text-[10px] text-muted-foreground/50 text-center">
            Real-time. Auto-refreshes on database changes.
          </p>
        </div>
      </div>
    </>
  );
};

export default AdminPortal;
