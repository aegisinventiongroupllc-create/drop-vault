import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle, XCircle, Video, DollarSign, Users, Eye, FileText, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminCreatorDetailProps {
  creator: {
    user_id: string;
    display_name: string | null;
    email: string | null;
    role: string;
    created_at: string;
  };
  onBack: () => void;
}

const REQUIRED_CONSENTS = [
  { key: "age_18_plus", label: "Confirms 18+ age verification" },
  { key: "hold_harmless", label: "Hold-harmless / liability waiver signed" },
  { key: "creator_safety", label: "Creator safety protocol agreed" },
  { key: "terms_of_service", label: "Terms of Service accepted" },
];

const AdminCreatorDetail = ({ creator, onBack }: AdminCreatorDetailProps) => {
  const [wallet, setWallet] = useState<{ total_earned: number; pending_balance: number; total_paid: number; ltc_address: string | null } | null>(null);
  const [media, setMedia] = useState<{ id: string; title: string; bucket: string; created_at: string }[]>([]);
  const [consents, setConsents] = useState<{ consent_type: string; created_at: string; ip_address: string | null }[]>([]);
  const [transactions, setTransactions] = useState<{ id: string; amount_usd: number; created_at: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      const [w, m, c, t] = await Promise.all([
        supabase.from("creator_wallets").select("total_earned, pending_balance, total_paid, ltc_address").eq("user_id", creator.user_id).maybeSingle(),
        supabase.from("creator_media").select("id, title, bucket, created_at").eq("creator_id", creator.user_id).order("created_at", { ascending: false }),
        supabase.from("legal_consents").select("consent_type, created_at, ip_address").eq("user_id", creator.user_id).order("created_at", { ascending: false }),
        supabase.from("transactions").select("id, amount_usd, created_at").eq("creator_id", creator.user_id).order("created_at", { ascending: false }).limit(10),
      ]);
      if (w.data) setWallet(w.data);
      if (m.data) setMedia(m.data);
      if (c.data) setConsents(c.data);
      if (t.data) setTransactions(t.data);
    };
    load();
  }, [creator.user_id]);

  const teaserCount = media.filter((m) => m.bucket === "teasers").length;
  const vaultCount = media.filter((m) => m.bucket === "vault").length;
  const consentMap = new Map(consents.map((c) => [c.consent_type, c]));
  const allBoxesChecked = REQUIRED_CONSENTS.every((r) => consentMap.has(r.key));

  return (
    <div className="mobile-scroll-shell">
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold text-foreground truncate">{creator.display_name || "Unnamed Creator"}</h1>
          <p className="text-xs text-muted-foreground truncate">{creator.email}</p>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${allBoxesChecked ? "bg-green-400/10 text-green-400 border border-green-400/30" : "bg-destructive/10 text-destructive border border-destructive/30"}`}>
          {allBoxesChecked ? "FULLY WAIVED" : "MISSING WAIVERS"}
        </span>
      </div>

      <div className="px-4 space-y-4 pb-12">
        {/* Identity */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Identity</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><p className="text-muted-foreground">User ID</p><p className="text-foreground font-mono truncate">{creator.user_id.slice(0, 8)}…</p></div>
            <div><p className="text-muted-foreground">Role</p><p className="text-foreground">{creator.role}</p></div>
            <div className="col-span-2"><p className="text-muted-foreground">Email</p><p className="text-foreground truncate">{creator.email || "—"}</p></div>
            <div className="col-span-2"><p className="text-muted-foreground">Joined</p><p className="text-foreground">{new Date(creator.created_at).toLocaleString()}</p></div>
          </div>
        </div>

        {/* Earnings */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-gold" /> Earnings & Payouts</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground">Earned</p>
              <p className="text-sm font-bold text-foreground">${wallet?.total_earned?.toFixed(2) ?? "0.00"}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground">Pending</p>
              <p className="text-sm font-bold text-gold">${wallet?.pending_balance?.toFixed(2) ?? "0.00"}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground">Paid</p>
              <p className="text-sm font-bold text-green-400">${wallet?.total_paid?.toFixed(2) ?? "0.00"}</p>
            </div>
          </div>
          {wallet?.ltc_address && (
            <div className="mt-3 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <p className="text-[10px] text-muted-foreground">LTC Wallet</p>
              <p className="text-[10px] text-foreground font-mono truncate">{wallet.ltc_address}</p>
            </div>
          )}
        </div>

        {/* Content stats */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Video className="w-4 h-4 text-primary" /> Content</h3>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground">Public Teasers</p>
              <p className="text-xl font-bold text-foreground">{teaserCount}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground">Vault Videos</p>
              <p className="text-xl font-bold text-gold">{vaultCount}</p>
            </div>
          </div>
        </div>

        {/* Legal checkmarks */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Legal Waivers Signed</h3>
          <div className="space-y-2">
            {REQUIRED_CONSENTS.map((r) => {
              const consent = consentMap.get(r.key);
              return (
                <div key={r.key} className="flex items-start gap-2 text-xs">
                  {consent ? (
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground">{r.label}</p>
                    {consent && (
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(consent.created_at).toLocaleString()} {consent.ip_address ? `• IP ${consent.ip_address}` : ""}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {!allBoxesChecked && (
            <p className="text-[10px] text-destructive mt-3 font-bold">⚠ Creator has NOT signed every required waiver. Do not allow uploads/payouts until complete.</p>
          )}
        </div>

        {/* Recent transactions */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Eye className="w-4 h-4 text-primary" /> Recent Activity</h3>
          {transactions.length === 0 && <p className="text-xs text-muted-foreground">No transactions yet.</p>}
          <div className="space-y-2">
            {transactions.map((t) => (
              <div key={t.id} className="flex justify-between text-xs border-b border-border pb-1.5">
                <span className="text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                <span className="text-foreground font-bold">${Number(t.amount_usd).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <a href={`mailto:${creator.email}`} className="block">
          <Button variant="outline" className="w-full">
            <Mail className="w-4 h-4 mr-2" /> Email Creator
          </Button>
        </a>
      </div>
    </div>
  );
};

export default AdminCreatorDetail;
