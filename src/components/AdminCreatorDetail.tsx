import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle, XCircle, Video, DollarSign, Users, FileText, Mail, Loader2, Send, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { getAdminPasscode } from "@/lib/adminSession";

interface AdminCreatorDetailProps {
  creator: {
    user_id: string;
    display_name: string | null;
    email: string | null;
    role?: string;
    created_at?: string;
  };
  onBack: () => void;
}

const REQUIRED_CONSENTS = [
  { key: "age_18_plus", label: "Confirms 18+ age verification" },
  { key: "hold_harmless", label: "Hold-harmless / liability waiver signed" },
  { key: "creator_safety", label: "Creator safety protocol agreed" },
  { key: "terms_of_service", label: "Terms of Service accepted" },
];

const usd = (n: unknown) => `$${(Number(n) || 0).toFixed(2)}`;

const AdminCreatorDetail = ({ creator, onBack }: AdminCreatorDetailProps) => {
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [media, setMedia] = useState<{ bucket: string }[]>([]);
  const [consents, setConsents] = useState<{ consent_type: string; created_at: string; ip_address: string | null }[]>([]);

  const call = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("admin-finance", {
      body: { action, creator_id: creator.user_id, ...extra },
      headers: { "x-admin-passcode": getAdminPasscode() },
    });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  }, [creator.user_id]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await call("creator_detail"));
    } catch (e) {
      toast({ title: "Could not load finances", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    load();
    supabase.from("creator_media").select("bucket").eq("creator_id", creator.user_id).then(({ data }) => setMedia(data || []));
    supabase.from("legal_consents").select("consent_type, created_at, ip_address").eq("user_id", creator.user_id)
      .order("created_at", { ascending: false }).then(({ data }) => setConsents(data || []));
  }, [load, creator.user_id]);

  const triggerPayout = async () => {
    const owed = Number(detail?.ledger?.owed) || 0;
    if (owed <= 0) return;
    if (!confirm(`Pay ${usd(owed)} to ${creator.display_name || creator.email}? Their balance will be cleared. Platform fees are not affected.`)) return;
    setPaying(true);
    try {
      const res = await call("creator_payout", { tx_hash: txHash });
      if (res.ok === false) {
        toast({ title: "Payout not processed", description: res.message });
      } else {
        setDetail(res);
        setTxHash("");
        toast({ title: "Payout recorded", description: `${usd(owed)} logged. Send the LTC from your wallet to the address shown.` });
      }
    } catch (e) {
      toast({ title: "Payout failed", description: String(e), variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  const L = detail?.ledger;
  const wallet = detail?.wallet;
  const payouts: any[] = detail?.payouts ?? [];
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
        <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${allBoxesChecked ? "bg-primary/10 text-primary border-primary/30" : "bg-destructive/10 text-destructive border-destructive/30"}`}>
          {allBoxesChecked ? "FULLY WAIVED" : "MISSING WAIVERS"}
        </span>
      </div>

      <div className="px-4 space-y-4 pb-12">
        {loading && !detail ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-[10px] uppercase text-muted-foreground">Access Credits Generated</p>
                <p className="text-2xl font-bold text-foreground">{L?.access_credits ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">library unlocks</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-[10px] uppercase text-muted-foreground">Gross Revenue</p>
                <p className="text-2xl font-bold text-foreground">{usd(L?.gross)}</p>
                <p className="text-[10px] text-muted-foreground">from unlocks</p>
              </div>
            </div>

            {/* Ledger */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Financial Ledger</h3>
              <div className="space-y-1.5 text-xs">
                <Row label="Gross earnings" value={usd(L?.gross)} />
                <Row label="Platform / admin fee (kept by you)" value={`− ${usd(Number(L?.platform_fee) + Number(L?.entry_tax))}`} muted />
                <Row label="Creator share earned" value={usd(L?.creator_share)} />
                <Row label="Already paid out" value={`− ${usd(L?.total_paid)}`} muted />
                <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold">
                  <span className="text-foreground">Net payout owed now</span>
                  <span className="text-primary text-base">{usd(L?.owed)}</span>
                </div>
              </div>
            </div>

            {/* Payout action */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Send className="w-4 h-4 text-primary" /> Trigger Payout</h3>
              <div className="bg-secondary/50 rounded-lg px-3 py-2">
                <p className="text-[10px] text-muted-foreground">Creator LTC Wallet</p>
                <p className="text-[11px] text-foreground font-mono break-all">{wallet?.ltc_address || "No LTC address saved"}</p>
              </div>
              <Input
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="LTC transaction ID (optional)"
                className="text-xs"
                maxLength={200}
              />
              <Button className="w-full" onClick={triggerPayout} disabled={paying || !(Number(L?.owed) > 0) || !wallet?.ltc_address}>
                {paying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                TRIGGER PAYOUT {usd(L?.owed)}
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Only this creator's balance is moved into the payout ledger. Your platform fees stay untouched. Send the LTC from your wallet to the address above.
              </p>
            </div>

            {/* Payout history */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><History className="w-4 h-4 text-primary" /> Payout History</h3>
              {payouts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No payouts yet.</p>
              ) : (
                <div className="space-y-2">
                  {payouts.map((p) => (
                    <div key={p.id} className="border-b border-border pb-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{new Date(p.created_at).toLocaleString()}</span>
                        <span className="font-bold text-foreground">{usd(p.amount_usd)}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono break-all">
                        {p.status.toUpperCase()}{p.batch_id ? " · batch" : ""} · {p.ltc_address}
                        {p.tx_hash ? ` · tx ${p.tx_hash}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Content */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Video className="w-4 h-4 text-primary" /> Content</h3>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-secondary/50 rounded-lg p-3"><p className="text-muted-foreground">Teasers</p><p className="text-xl font-bold">{media.filter((m) => m.bucket === "teasers").length}</p></div>
            <div className="bg-secondary/50 rounded-lg p-3"><p className="text-muted-foreground">Vault Videos</p><p className="text-xl font-bold">{media.filter((m) => m.bucket === "vault").length}</p></div>
          </div>
        </div>

        {/* Legal */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Legal Waivers Signed</h3>
          <div className="space-y-2">
            {REQUIRED_CONSENTS.map((r) => {
              const c = consentMap.get(r.key);
              return (
                <div key={r.key} className="flex items-start gap-2 text-xs">
                  {c ? <CheckCircle className="w-4 h-4 text-primary mt-0.5" /> : <XCircle className="w-4 h-4 text-destructive mt-0.5" />}
                  <div>
                    <p className="text-foreground">{r.label}</p>
                    {c && <p className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}{c.ip_address ? ` • IP ${c.ip_address}` : ""}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 text-xs">
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Identity</h3>
          <p className="text-muted-foreground">User ID <span className="font-mono text-foreground">{creator.user_id.slice(0, 8)}…</span></p>
        </div>

        {creator.email && (
          <a href={`mailto:${creator.email}`} className="block">
            <Button variant="outline" className="w-full"><Mail className="w-4 h-4 mr-2" /> Email Creator</Button>
          </a>
        )}
      </div>
    </div>
  );
};

const Row = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className={muted ? "text-muted-foreground" : "text-foreground font-semibold"}>{value}</span>
  </div>
);

export default AdminCreatorDetail;
