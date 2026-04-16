import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Upload, Wallet, RefreshCw } from "lucide-react";

const ADMIN_PASSWORD = "052417";
const SESSION_KEY = "dtt_secret_admin_ok";

interface Stats {
  totalCreators: number;
  pendingUploads: number;
  wallets: { user_id: string; ltc_address: string | null; pending_balance: number; display_name: string | null; email: string | null }[];
}

const SecretAdmin = () => {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { count: totalCreators } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "creator");

      const { data: vaultFiles } = await supabase.storage.from("vault").list("", { limit: 1000 });
      const pendingUploads = vaultFiles?.length ?? 0;

      const { data: walletRows } = await supabase
        .from("creator_wallets")
        .select("user_id, ltc_address, pending_balance");

      const userIds = (walletRows ?? []).map((w) => w.user_id);
      let profileMap: Record<string, { display_name: string | null; email: string | null }> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name, email")
          .in("user_id", userIds);
        profileMap = Object.fromEntries((profs ?? []).map((p) => [p.user_id, { display_name: p.display_name, email: p.email }]));
      }

      setStats({
        totalCreators: totalCreators ?? 0,
        pendingUploads,
        wallets: (walletRows ?? []).map((w) => ({
          user_id: w.user_id,
          ltc_address: w.ltc_address,
          pending_balance: Number(w.pending_balance) || 0,
          display_name: profileMap[w.user_id]?.display_name ?? null,
          email: profileMap[w.user_id]?.email ?? null,
        })),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authed) return;
    loadStats();
    const channel = supabase
      .channel("secret-admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, loadStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "creator_wallets" }, loadStats)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authed]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
      setErr("");
    } else {
      setErr("Access denied.");
    }
  };

  return (
    <>
      <Helmet>
        <title>Restricted</title>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      {!authed ? (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <form onSubmit={submit} className="w-full max-w-sm space-y-4">
            <h1 className="text-center text-xl font-bold tracking-widest text-foreground">RESTRICTED</h1>
            <Input
              type="password"
              autoFocus
              placeholder="Password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setErr(""); }}
              className="text-center"
            />
            {err && <p className="text-xs text-destructive text-center">{err}</p>}
            <Button type="submit" variant="neon" className="w-full">ENTER</Button>
          </form>
        </div>
      ) : (
        <div className="min-h-screen bg-background text-foreground p-4 pb-20">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-wider">ADMIN DASHBOARD</h1>
              <Button size="sm" variant="outline" onClick={loadStats} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
                  <Users className="w-4 h-4" /> Creators
                </div>
                <div className="text-3xl font-bold mt-2">{stats?.totalCreators ?? "—"}</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
                  <Upload className="w-4 h-4" /> Pending Uploads
                </div>
                <div className="text-3xl font-bold mt-2">{stats?.pendingUploads ?? "—"}</div>
              </Card>
            </div>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-3">
                <Wallet className="w-4 h-4" /> Payout Wallets (LTC)
              </div>
              {!stats || stats.wallets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No wallets registered yet.</p>
              ) : (
                <div className="space-y-2">
                  {stats.wallets.map((w) => (
                    <div key={w.user_id} className="border border-border rounded-md p-3 text-xs space-y-1">
                      <div className="flex justify-between gap-2">
                        <span className="font-semibold truncate">{w.display_name || w.email || w.user_id.slice(0, 8)}</span>
                        <span className="text-primary font-mono">${w.pending_balance.toFixed(2)}</span>
                      </div>
                      <div className="font-mono break-all text-muted-foreground">
                        {w.ltc_address || <span className="italic">No LTC address set</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <p className="text-[10px] text-muted-foreground/50 text-center">
              Real-time. Auto-refreshes on database changes.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default SecretAdmin;
