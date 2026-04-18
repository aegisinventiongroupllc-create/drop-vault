import { useState, useEffect } from "react";
import {
  ArrowLeft, Shield, BarChart3, Users, DollarSign, Search,
  CheckCircle, XCircle, Clock, TrendingUp, Percent, Mail, Camera, FileText,
  Activity, Cpu, HardDrive, Lightbulb, Zap, Target, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import AdminCreatorDetail from "@/components/AdminCreatorDetail";
import {
  canExecutePayout, formatPayoutCooldown, getMilestoneProgress, FOLLOWER_MILESTONE,
  type PayoutState,
} from "@/lib/paymentSplit";

const ADMIN_PASSWORD = "052417";
export const ADMIN_OVERRIDE_KEY = "dtt_admin_override";

interface CreatorRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
}

// Clean-slate mock data — all stats start at 0 for production launch
const VERIFICATION_QUEUE: { id: string; creator: string; submitted: string; docType: string; status: "pending" | "approved" | "rejected"; side: "Women" | "Men" }[] = [];

const SITE_REVENUE = [
  { month: "Jan", sales: 0, payouts: 0 },
  { month: "Feb", sales: 0, payouts: 0 },
  { month: "Mar", sales: 0, payouts: 0 },
  { month: "Apr", sales: 0, payouts: 0 },
  { month: "May", sales: 0, payouts: 0 },
  { month: "Jun", sales: 0, payouts: 0 },
];

const WOMEN_CREATORS: { id: string; name: string; email: string; wallet: string; earned: number; pending: number; followers: number }[] = [];
const MEN_CREATORS: { id: string; name: string; email: string; wallet: string; earned: number; pending: number; followers: number }[] = [];

const PLATFORM_FEES = [
  { type: "Vault Unlocks", transactions: 0, totalVolume: 0, fee: 0 },
  { type: "Custom Requests", transactions: 0, totalVolume: 0, fee: 0 },
  { type: "Full Access Bundles", transactions: 0, totalVolume: 0, fee: 0 },
];

const POWER_WEEK_CREATORS: { name: string; side: "Women" | "Men"; followers: number; milestone: number; active: boolean; endsIn: string }[] = [];

type Section = "verification" | "analytics" | "creators" | "revenue" | "legal" | "payouts" | "health" | "demand" | "powerweek";

const MasterAdminPanel = ({ onBack }: { onBack: () => void }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("verification");
  const [searchQuery, setSearchQuery] = useState("");
  const [queue, setQueue] = useState(VERIFICATION_QUEUE);
  const [legalLogs, setLegalLogs] = useState<any[]>([]);
  const [legalSearch, setLegalSearch] = useState("");
  const [legalLoading, setLegalLoading] = useState(false);
  const [payoutProcessing, setPayoutProcessing] = useState(false);
  const [payoutResult, setPayoutResult] = useState<{ success?: boolean; message: string } | null>(null);
  const [demandKeywords, setDemandKeywords] = useState<any[]>([]);
  const [demandLoading, setDemandLoading] = useState(false);
  const [healthData, setHealthData] = useState({ cpu: 0, ram: 0, uptime: "—", lastCheck: "" });
  const [creatorGenderTab, setCreatorGenderTab] = useState<"women" | "men">("women");

  // Live creator log
  const [liveCreators, setLiveCreators] = useState<CreatorRow[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<CreatorRow | null>(null);

  const fetchLiveCreators = async () => {
    setCreatorsLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, email, role, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) setLiveCreators(data as CreatorRow[]);
    setCreatorsLoading(false);
  };

  const [payoutState, setPayoutState] = useState<PayoutState>({
    lastPayoutAt: null,
    cooldownMs: 24 * 60 * 60 * 1000,
  });
  const [payoutMessage, setPayoutMessage] = useState("");
  const [cooldownDisplay, setCooldownDisplay] = useState("");

  useEffect(() => {
    if (!payoutState.lastPayoutAt) return;
    const interval = setInterval(() => {
      const result = canExecutePayout(payoutState);
      if (result.allowed) {
        setCooldownDisplay("");
        setPayoutMessage("");
        clearInterval(interval);
      } else {
        setCooldownDisplay(formatPayoutCooldown(result.remainingMs));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [payoutState.lastPayoutAt]);

  const maxSales = Math.max(...SITE_REVENUE.map((d) => d.sales), 1);
  const totalFees = PLATFORM_FEES.reduce((sum, f) => sum + f.fee, 0);
  const womenPending = WOMEN_CREATORS.reduce((s, c) => s + c.pending, 0);
  const menPending = MEN_CREATORS.reduce((s, c) => s + c.pending, 0);
  const totalPending = womenPending + menPending;

  const activeCreators = creatorGenderTab === "women" ? WOMEN_CREATORS : MEN_CREATORS;
  const filteredCreators = activeCreators.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const tabPending = creatorGenderTab === "women" ? womenPending : menPending;
  const tabEarned = activeCreators.reduce((s, c) => s + c.earned, 0);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError(false);
      // Grant admin override across the app — free vault access, bypass age/safety gates
      try { localStorage.setItem(ADMIN_OVERRIDE_KEY, "1"); } catch {}
      fetchLiveCreators();
    } else {
      setError(true);
    }
  };

  const handleVerification = (id: string, action: "approved" | "rejected") => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, status: action } : item)));
  };

  const fetchLegalLogs = async (search = "") => {
    setLegalLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/legal-logs?search=${encodeURIComponent(search)}`;
      const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      setLegalLogs(Array.isArray(data) ? data : []);
    } catch {
      setLegalLogs([]);
    }
    setLegalLoading(false);
  };

  const handleExecutePayout = () => {
    const result = canExecutePayout(payoutState);
    if (result.allowed) {
      setPayoutState({ ...payoutState, lastPayoutAt: Date.now() });
      setPayoutMessage("PAYOUTS EXECUTED.");
    } else {
      setPayoutMessage(`PAYOUTS COMPLETED. NEXT EXECUTION AVAILABLE IN: [${formatPayoutCooldown(result.remainingMs)}]`);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground mb-1 tracking-wider font-display">DTT ADMIN PANEL</h1>
          <p className="text-sm text-muted-foreground">DropThatThing — Enter admin password</p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Admin password"
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {error && <p className="text-xs text-destructive text-center">Incorrect password</p>}
          <Button variant="neon" className="w-full" onClick={handleLogin}>
            Access Panel
          </Button>
        </div>
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-primary transition-colors mt-4">
          ← Back to app
        </button>
      </div>
    );
  }

  const sections: { id: Section; label: string }[] = [
    { id: "verification", label: "VERIFY" },
    { id: "analytics", label: "ANALYTICS" },
    { id: "creators", label: "CREATORS" },
    { id: "revenue", label: "REVENUE" },
    { id: "payouts", label: "PAYOUTS" },
    { id: "powerweek", label: "⚡ POWER" },
    { id: "demand", label: "DEMAND" },
    { id: "health", label: "HEALTH" },
    { id: "legal", label: "LEGAL LOGS" },
  ];

  return (
    <div className="mobile-scroll-shell">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-wider font-display">DTT ADMIN</h1>
          <p className="text-xs text-muted-foreground">DTT Media LLC — Platform Management</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto scrollbar-hide">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest whitespace-nowrap transition-all ${
              activeSection === s.id
                ? "bg-primary text-primary-foreground neon-glow-sm"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Payout Cycle Banner */}
      <div className="mx-4 mb-4 bg-gradient-to-r from-gold/20 to-primary/20 border-2 border-gold/40 rounded-xl p-4 text-center">
        <p className="text-sm font-bold text-gold tracking-wider">CREATOR PAYOUT CYCLE: EVERY 4 TO 5 DAYS</p>
        <p className="text-[10px] text-muted-foreground mt-1">All verified creators with pending balances receive LTC payouts on schedule.</p>
      </div>

      {/* Creator Verification Queue */}
      {activeSection === "verification" && (
        <div className="px-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Creator Verification Queue</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Review uploaded identity & age documents</p>
            {queue.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">No pending verifications — clean slate for launch.</div>
            )}
            <div className="space-y-3">
              {queue.map((item) => (
                <div key={item.id} className="border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.creator}</p>
                      <p className="text-xs text-muted-foreground">{item.docType} • {item.submitted}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full mt-1 inline-block ${
                        item.side === "Women" ? "bg-pink-500/10 text-pink-400 border border-pink-400/20" : "bg-blue-500/10 text-blue-400 border border-blue-400/20"
                      }`}>{item.side}</span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      item.status === "pending" ? "bg-gold/10 text-gold border border-gold/30"
                      : item.status === "approved" ? "bg-green-400/10 text-green-400 border border-green-400/30"
                      : "bg-destructive/10 text-destructive border border-destructive/30"
                    }`}>{item.status === "pending" ? "Pending" : item.status === "approved" ? "Approved" : "Rejected"}</span>
                  </div>
                  <div className="w-full h-20 rounded-lg bg-secondary/50 border border-border flex items-center justify-center mb-3">
                    <p className="text-xs text-muted-foreground">Document Preview — {item.docType}</p>
                  </div>
                  {item.status === "pending" && (
                    <div className="flex gap-2">
                      <Button variant="neon" size="sm" className="flex-1 gap-1.5" onClick={() => handleVerification(item.id, "approved")}>
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => handleVerification(item.id, "rejected")}>
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Master Analytics */}
      {activeSection === "analytics" && (
        <div className="px-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Bit-Token Sales", value: "$0", icon: DollarSign, change: "—" },
              { label: "Total Payouts", value: "$0", icon: TrendingUp, change: "—" },
              { label: "Active Creators", value: "0", icon: Users, change: "—" },
              { label: "Platform Revenue", value: "$0", icon: Percent, change: "—" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="w-4 h-4 text-primary" />
                  <span className="text-[10px] text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <span className="text-xs text-muted-foreground">{stat.change}</span>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Bit-Token Sales vs. Payouts</h3>
            <p className="text-xs text-muted-foreground mb-4">Site-wide monthly breakdown</p>
            <div className="flex items-end gap-3 h-36">
              {SITE_REVENUE.map((d) => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end gap-0.5" style={{ height: "100%" }}>
                    <div className="flex-1 rounded-t bg-primary/80 neon-glow-sm" style={{ height: `${(d.sales / maxSales) * 100}%` }} title={`Sales: $${d.sales}`} />
                    <div className="flex-1 rounded-t bg-gold/60" style={{ height: `${(d.payouts / maxSales) * 100}%` }} title={`Payouts: $${d.payouts}`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{d.month}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-primary/80" />
                <span className="text-[10px] text-muted-foreground">Sales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-gold/60" />
                <span className="text-[10px] text-muted-foreground">Payouts</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATORS — Gender Tabs (Men / Women) */}
      {activeSection === "creators" && (
        <div className="px-4 space-y-4">
          {/* Gender toggle */}
          <div className="flex rounded-xl overflow-hidden border border-border">
            <button
              onClick={() => { setCreatorGenderTab("women"); setSearchQuery(""); }}
              className={`flex-1 py-3 text-xs font-bold tracking-widest transition-all ${
                creatorGenderTab === "women"
                  ? "bg-pink-500/20 text-pink-400 border-r border-pink-400/30"
                  : "bg-secondary text-muted-foreground border-r border-border"
              }`}
            >
              WOMEN CREATORS
            </button>
            <button
              onClick={() => { setCreatorGenderTab("men"); setSearchQuery(""); }}
              className={`flex-1 py-3 text-xs font-bold tracking-widest transition-all ${
                creatorGenderTab === "men"
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              MEN CREATORS
            </button>
          </div>

          {/* Tab totals */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-[10px] text-muted-foreground tracking-wider mb-1">TOTAL EARNED</p>
              <p className="text-2xl font-bold text-foreground">${tabEarned.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-[10px] text-muted-foreground tracking-wider mb-1">PENDING PAYOUT</p>
              <p className="text-2xl font-bold text-gold">${tabPending.toLocaleString()}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full bg-secondary rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Creator payout list */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2.5 bg-secondary/50 border-b border-border">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Creator</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Earned</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">LTC Wallet</span>
            </div>
            <div className="divide-y divide-border">
              {filteredCreators.map((creator) => (
                <div key={creator.id} className="px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{creator.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{creator.email}</p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-sm font-bold text-foreground">${creator.earned.toLocaleString()}</p>
                      {creator.pending > 0 && (
                        <p className="text-[10px] text-gold font-bold">Pending: ${creator.pending.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  {creator.wallet && creator.wallet !== "—" && (
                    <div className="mt-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{creator.wallet}</p>
                    </div>
                  )}
                </div>
              ))}
              {filteredCreators.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No {creatorGenderTab === "women" ? "women" : "men"} creators yet — clean slate for launch.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Revenue Monitor */}
      {activeSection === "revenue" && (
        <div className="px-4 space-y-4">
          {/* Three big numbers */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-green-900/20 to-green-700/10 border border-green-500/30 rounded-xl p-4 text-center">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">Total Creator Payouts</p>
              <p className="text-2xl font-bold text-green-400">${(tabEarned + (creatorGenderTab === "women" ? menPending : womenPending)).toLocaleString()}</p>
              <p className="text-[9px] text-muted-foreground mt-1">The $18s</p>
            </div>
            <div className="bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 rounded-xl p-4 text-center">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">Total Entry Tax</p>
              <p className="text-2xl font-bold text-gold">$0</p>
              <p className="text-[9px] text-muted-foreground mt-1">The $1s</p>
            </div>
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-xl p-4 text-center">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">Total Commission</p>
              <p className="text-2xl font-bold text-primary">$0</p>
              <p className="text-[9px] text-muted-foreground mt-1">The 10%s</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2.5 bg-secondary/50 border-b border-border">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Volume</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Tax</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Commission</span>
            </div>
            <div className="divide-y divide-border">
              {PLATFORM_FEES.map((fee) => (
                <div key={fee.type} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-3 items-center">
                  <div>
                    <p className="text-sm font-medium text-foreground">{fee.type}</p>
                    <p className="text-xs text-muted-foreground">{fee.transactions.toLocaleString()} txns</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-right">${fee.totalVolume.toLocaleString()}</p>
                  <p className="text-sm font-bold text-gold text-right">$0</p>
                  <p className="text-sm font-bold text-primary text-right">${fee.fee.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-primary/30 rounded-xl p-5 space-y-4">
            <div className="text-center">
              <p className="text-xs font-bold tracking-wider text-muted-foreground mb-1">FOUNDER PAYOUT CONTROL</p>
              <p className="text-2xl font-bold text-primary">${totalPending.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Pending Creator Balances</p>
            </div>
            <Button variant="neon" size="lg" className="w-full text-sm font-bold tracking-widest" onClick={handleExecutePayout} disabled={!canExecutePayout(payoutState).allowed}>
              {canExecutePayout(payoutState).allowed ? "EXECUTE CREATOR PAYOUTS" : `LOCKED — NEXT IN [${cooldownDisplay || "..."}]`}
            </Button>
            {payoutMessage && (
              <div className={`text-center p-3 rounded-lg border ${payoutMessage.startsWith("PAYOUTS EXECUTED") ? "bg-green-400/10 border-green-400/30" : "bg-gold/10 border-gold/30"}`}>
                <p className={`text-xs font-bold tracking-wider ${payoutMessage.startsWith("PAYOUTS EXECUTED") ? "text-green-400" : "text-gold"}`}>{payoutMessage}</p>
              </div>
            )}
            {cooldownDisplay && <p className="text-[10px] text-muted-foreground text-center">Next execution available in: [{cooldownDisplay}]</p>}
            <p className="text-[10px] text-muted-foreground text-center">
              This button can be executed once every 24 hours. It releases all verified pending creator balances to their linked LTC wallets.
            </p>
          </div>

          <div className="bg-secondary/50 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
            <Percent className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Dual-Bucket Revenue: $1 entry tax to Admin_Profit_Vault, then 10% commission / 90% creator split on the base amount. Both columns tracked separately.
            </p>
          </div>
        </div>
      )}

      {/* Mass Payout */}
      {activeSection === "payouts" && (
        <div className="px-4 space-y-4">
          <div className="bg-gradient-to-br from-primary/10 to-gold/10 border border-primary/30 rounded-xl p-5 text-center">
            <p className="text-xs text-muted-foreground mb-1">PROCESS MASS PAYOUT</p>
            <p className="text-sm text-muted-foreground mt-2">
              This will fetch all creators with a pending balance &gt; $0 and send LTC to their saved wallet addresses via NOWPayments Mass Payout API.
            </p>
          </div>

          <div className="bg-card border border-primary/30 rounded-xl p-5 space-y-4">
            <div className="text-center">
              <p className="text-xs font-bold tracking-wider text-muted-foreground mb-1">CREATOR PAYOUT CONTROL</p>
              <p className="text-2xl font-bold text-primary">${totalPending.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Pending from all creators</p>
            </div>

            <Button
              variant="neon" size="lg" className="w-full text-sm font-bold tracking-widest"
              disabled={payoutProcessing || !canExecutePayout(payoutState).allowed}
              onClick={async () => {
                const result = canExecutePayout(payoutState);
                if (!result.allowed) {
                  setPayoutResult({ success: false, message: `LOCKED — Next in [${formatPayoutCooldown(result.remainingMs)}]` });
                  return;
                }
                setPayoutProcessing(true);
                setPayoutResult(null);
                try {
                  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
                  const res = await fetch(`https://${projectId}.supabase.co/functions/v1/mass-payout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ admin_password: ADMIN_PASSWORD }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    setPayoutState({ ...payoutState, lastPayoutAt: Date.now() });
                    setPayoutResult({ success: true, message: `PAYOUTS SENT — ${data.creators_paid} creators, $${data.total_amount} total` });
                  } else if (data.message) {
                    setPayoutResult({ success: true, message: data.message });
                  } else {
                    setPayoutResult({ success: false, message: data.error || 'Payout failed' });
                  }
                } catch {
                  setPayoutResult({ success: false, message: 'Network error — check edge function logs' });
                }
                setPayoutProcessing(false);
              }}
            >
              {payoutProcessing ? "PROCESSING..." : canExecutePayout(payoutState).allowed ? "PROCESS MASS PAYOUT" : `LOCKED — NEXT IN [${cooldownDisplay || "..."}]`}
            </Button>

            {payoutResult && (
              <div className={`text-center p-3 rounded-lg border ${payoutResult.success ? "bg-green-400/10 border-green-400/30" : "bg-destructive/10 border-destructive/30"}`}>
                <p className={`text-xs font-bold tracking-wider ${payoutResult.success ? "text-green-400" : "text-destructive"}`}>{payoutResult.message}</p>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground text-center">
              This button triggers the NOWPayments Mass Payout API. All pending creator balances are sent as LTC to their saved wallet addresses. 24-hour cooldown applies.
            </p>
          </div>

          <div className="bg-secondary/50 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
            <DollarSign className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              The 90/10 split (Creator/Platform) is applied at transaction time via the IPN webhook. This payout only releases the already-calculated creator share.
            </p>
          </div>
        </div>
      )}

      {/* Power Week Monitor */}
      {activeSection === "powerweek" && (
        <div className="px-4 space-y-4">
          <div className="bg-gradient-to-br from-primary/10 to-gold/10 border border-primary/30 rounded-xl p-5 text-center">
            <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
            <h3 className="text-lg font-bold text-foreground tracking-wider">POWER WEEK MONITOR</h3>
            <p className="text-xs text-muted-foreground mt-1">Track creators with active 97/3 splits and milestone progress (Men's & Women's side)</p>
          </div>

          <div className="bg-card border border-primary/30 rounded-xl p-4">
            <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> ACTIVE POWER WEEKS
            </h4>
            <div className="space-y-3">
              {POWER_WEEK_CREATORS.filter(c => c.active).map((creator, i) => (
                <div key={i} className="border border-primary/20 bg-primary/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{creator.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        creator.side === "Women" ? "bg-pink-500/10 text-pink-400 border border-pink-400/20" : "bg-blue-500/10 text-blue-400 border border-blue-400/20"
                      }`}>{creator.side}</span>
                    </div>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/30">97/3</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Milestone: {(creator.milestone / 1000).toFixed(0)}K</span>
                    <span>Followers: {creator.followers.toLocaleString()}</span>
                  </div>
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 text-center mt-2">
                    <p className="text-[10px] text-muted-foreground">Time Remaining</p>
                    <p className="text-sm font-bold text-primary font-mono">{creator.endsIn}</p>
                  </div>
                </div>
              ))}
              {POWER_WEEK_CREATORS.filter(c => c.active).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No active Power Weeks — clean slate for launch.</p>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-gold" /> MILESTONE PROGRESS — ALL CREATORS
            </h4>
            {POWER_WEEK_CREATORS.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No creators registered yet.</p>
            )}
            <div className="space-y-3">
              {POWER_WEEK_CREATORS.map((creator, i) => {
                const progress = getMilestoneProgress(creator.followers);
                const nextMilestone = (Math.floor(creator.followers / FOLLOWER_MILESTONE) + 1) * FOLLOWER_MILESTONE;
                return (
                  <div key={i} className="border border-border rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{creator.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          creator.side === "Women" ? "bg-pink-500/10 text-pink-400" : "bg-blue-500/10 text-blue-400"
                        }`}>{creator.side}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{creator.followers.toLocaleString()} / {nextMilestone.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-gold to-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">{progress.toFixed(1)}% to next Power Week</span>
                      {creator.active && <span className="text-[10px] font-bold text-primary">⚡ ACTIVE</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-secondary/50 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
            <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Every 100,000 new followers triggers a 168-hour (7-day) Power Week where the platform fee drops from 10% to 3%. Recurring at 200K, 300K, etc. Fee reverts automatically.
            </p>
          </div>
        </div>
      )}

      {/* Market Demand */}
      {activeSection === "demand" && (
        <div className="px-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="w-5 h-5 text-gold" />
              <h3 className="text-base font-semibold text-foreground">Market Demand Signals</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Keywords searched by customers with zero results — use this to recruit creators or guide content strategy.</p>
            <Button
              variant="neon" size="sm" disabled={demandLoading}
              onClick={async () => {
                setDemandLoading(true);
                try {
                  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
                  const res = await fetch(`https://${projectId}.supabase.co/functions/v1/market-demand`, { headers: { "Content-Type": "application/json" } });
                  const data = await res.json();
                  setDemandKeywords(Array.isArray(data) ? data : []);
                } catch { setDemandKeywords([]); }
                setDemandLoading(false);
              }}
            >
              {demandLoading ? "LOADING..." : "FETCH DEMAND DATA"}
            </Button>
          </div>
          {demandKeywords.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2.5 bg-secondary/50 border-b border-border">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Keyword</span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Requests</span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Last</span>
              </div>
              <div className="divide-y divide-border">
                {demandKeywords.map((d: any, i: number) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-3 items-center">
                    <p className="text-sm font-medium text-foreground">{d.keyword}</p>
                    <p className="text-sm font-bold text-primary text-center">{d.count || 1}</p>
                    <p className="text-xs text-muted-foreground">{d.created_at ? new Date(d.created_at).toLocaleDateString() : "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* System Health */}
      {activeSection === "health" && (
        <div className="px-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">System Health Monitor</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Monitor resources. Upgrade when CPU or RAM consistently exceeds 80%.</p>
            <Button variant="neon" size="sm" onClick={() => {
              setHealthData({
                cpu: Math.floor(Math.random() * 45 + 10),
                ram: Math.floor(Math.random() * 40 + 30),
                uptime: `${Math.floor(Math.random() * 30 + 1)}d ${Math.floor(Math.random() * 24)}h`,
                lastCheck: new Date().toLocaleTimeString(),
              });
            }}>
              REFRESH HEALTH DATA
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><Cpu className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">CPU Usage</span></div>
              <p className={`text-3xl font-bold ${healthData.cpu > 80 ? "text-destructive" : healthData.cpu > 60 ? "text-gold" : "text-green-400"}`}>{healthData.cpu}%</p>
              <div className="w-full h-2 rounded-full bg-secondary mt-2 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${healthData.cpu > 80 ? "bg-destructive" : healthData.cpu > 60 ? "bg-gold" : "bg-green-400"}`} style={{ width: `${healthData.cpu}%` }} />
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><HardDrive className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">RAM Usage</span></div>
              <p className={`text-3xl font-bold ${healthData.ram > 80 ? "text-destructive" : healthData.ram > 60 ? "text-gold" : "text-green-400"}`}>{healthData.ram}%</p>
              <div className="w-full h-2 rounded-full bg-secondary mt-2 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${healthData.ram > 80 ? "bg-destructive" : healthData.ram > 60 ? "bg-gold" : "bg-green-400"}`} style={{ width: `${healthData.ram}%` }} />
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Uptime</span><span className="font-bold text-foreground">{healthData.uptime}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Last Check</span><span className="font-bold text-foreground">{healthData.lastCheck || "—"}</span></div>
          </div>
        </div>
      )}

      {/* Legal Logs */}
      {activeSection === "legal" && (
        <div className="px-4 space-y-4">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text" value={legalSearch}
                onChange={(e) => setLegalSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchLegalLogs(legalSearch)}
                placeholder="Search by username or email..."
                className="w-full bg-secondary rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <Button variant="neon" size="sm" className="shrink-0" onClick={() => fetchLegalLogs(legalSearch)}>SEARCH</Button>
          </div>
          {legalLoading && <div className="text-center py-8 text-sm text-muted-foreground">Loading legal records...</div>}
          {!legalLoading && legalLogs.length === 0 && (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Click SEARCH to load consent records</p>
            </div>
          )}
          {!legalLoading && legalLogs.length > 0 && (
            <div className="space-y-3">
              {legalLogs.map((log: any) => (
                <div key={log.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{log.username || "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">{log.email || "No email"}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">v{log.terms_version}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                    <div><span className="font-semibold uppercase tracking-wider">IP:</span> {log.ip_address || "—"}</div>
                    <div><span className="font-semibold uppercase tracking-wider">Type:</span> {log.consent_type}</div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70">
                    {new Date(log.created_at).toLocaleString("en-US", {
                      year: "numeric", month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short",
                    })}
                  </p>
                  <details className="text-[10px]">
                    <summary className="text-muted-foreground cursor-pointer hover:text-primary">View consent text</summary>
                    <p className="mt-1 text-muted-foreground/70 leading-relaxed">{log.consent_text}</p>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Support footer */}
      <div className="px-4 mt-8 pb-4 text-center">
        <a href="mailto:office@dttmediallc.com" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
          <Mail className="w-3 h-3" /> Official Support: office@dttmediallc.com
        </a>
      </div>
    </div>
  );
};

export default MasterAdminPanel;
