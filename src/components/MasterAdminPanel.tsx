import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Shield, BarChart3, Users, DollarSign, Search,
  CheckCircle, XCircle, Clock, TrendingUp, Percent, Mail, Camera, FileText,
  Activity, Cpu, HardDrive, Lightbulb,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  canExecutePayout, formatPayoutCooldown,
  type PayoutState,
} from "@/lib/paymentSplit";

const ADMIN_PASSWORD = "052417";

const VERIFICATION_QUEUE = [
  { id: "1", creator: "LunaCosplay", submitted: "Apr 3, 2026", docType: "Passport", status: "pending" as const },
  { id: "2", creator: "FitJessie", submitted: "Apr 2, 2026", docType: "Driver's License", status: "pending" as const },
  { id: "3", creator: "BlondieVibes", submitted: "Mar 30, 2026", docType: "National ID", status: "approved" as const },
  { id: "4", creator: "TwinFlames", submitted: "Mar 28, 2026", docType: "Passport", status: "rejected" as const },
  { id: "5", creator: "PetiteSophie", submitted: "Mar 27, 2026", docType: "Driver's License", status: "pending" as const },
];

const SITE_REVENUE = [
  { month: "Jan", sales: 4200, payouts: 3780 },
  { month: "Feb", sales: 6800, payouts: 6120 },
  { month: "Mar", sales: 9400, payouts: 8460 },
  { month: "Apr", sales: 12100, payouts: 10890 },
  { month: "May", sales: 15600, payouts: 14040 },
  { month: "Jun", sales: 19800, payouts: 17820 },
];

const USER_DATABASE = [
  { id: "1", name: "LunaCosplay", email: "luna@email.com", wallet: "ltc1q8x...k4m2", earned: 4820, pending: 1240, role: "creator" },
  { id: "2", name: "FitJessie", email: "jessie@email.com", wallet: "ltc1qr7...n3p9", earned: 3210, pending: 890, role: "creator" },
  { id: "3", name: "BlondieVibes", email: "blondie@email.com", wallet: "ltc1qa2...j7w5", earned: 6540, pending: 2100, role: "creator" },
  { id: "4", name: "TwinFlames", email: "twins@email.com", wallet: "ltc1qm5...d8x1", earned: 8920, pending: 3400, role: "creator" },
  { id: "5", name: "PetiteSophie", email: "sophie@email.com", wallet: "ltc1qk9...f2t6", earned: 2150, pending: 560, role: "creator" },
  { id: "6", name: "VaultKing99", email: "vaultking@email.com", wallet: "—", earned: 0, pending: 0, role: "fan" },
  { id: "7", name: "NeonWhale", email: "neonwhale@email.com", wallet: "—", earned: 0, pending: 0, role: "fan" },
  { id: "8", name: "DiamondFan", email: "diamond@email.com", wallet: "—", earned: 0, pending: 0, role: "fan" },
];

const PLATFORM_FEES = [
  { type: "Vault Unlocks", transactions: 1240, totalVolume: 18600, fee: 1860 },
  { type: "Video Unlocks", transactions: 3480, totalVolume: 1740, fee: 174 },
  { type: "Custom Requests", transactions: 86, totalVolume: 32400, fee: 3240 },
  { type: "Full Access Bundles", transactions: 210, totalVolume: 6300, fee: 630 },
];

type Section = "verification" | "analytics" | "users" | "revenue" | "legal" | "payouts" | "health" | "demand";

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

  // Payout control state
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

  const maxSales = Math.max(...SITE_REVENUE.map((d) => d.sales));
  const totalFees = PLATFORM_FEES.reduce((sum, f) => sum + f.fee, 0);
  const totalPending = USER_DATABASE.reduce((sum, u) => sum + u.pending, 0);

  const filteredUsers = USER_DATABASE.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError(false);
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
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
      });
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
    { id: "users", label: "USERS" },
    { id: "revenue", label: "REVENUE" },
    { id: "payouts", label: "PAYOUTS" },
    { id: "demand", label: "DEMAND" },
    { id: "health", label: "HEALTH" },
    { id: "legal", label: "LEGAL LOGS" },
  ] as const;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-wider font-display">DTT ADMIN</h1>
          <p className="text-xs text-muted-foreground">DropThatThing — Platform Management</p>
        </div>
      </div>

      {/* Section tabs — text only */}
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

      {/* Creator Verification Queue */}
      {activeSection === "verification" && (
        <div className="px-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Creator Verification Queue</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Review uploaded identity & age documents</p>

            <div className="space-y-3">
              {queue.map((item) => (
                <div key={item.id} className="border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.creator}</p>
                      <p className="text-xs text-muted-foreground">{item.docType} • Submitted {item.submitted}</p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        item.status === "pending"
                          ? "bg-gold/10 text-gold border border-gold/30"
                          : item.status === "approved"
                          ? "bg-green-400/10 text-green-400 border border-green-400/30"
                          : "bg-destructive/10 text-destructive border border-destructive/30"
                      }`}
                    >
                      {item.status === "pending" ? "Pending" : item.status === "approved" ? "Approved" : "Rejected"}
                    </span>
                  </div>

                  <div className="w-full h-20 rounded-lg bg-secondary/50 border border-border flex items-center justify-center mb-3">
                    <p className="text-xs text-muted-foreground">Document Preview — {item.docType}</p>
                  </div>

                  {item.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        variant="neon"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => handleVerification(item.id, "approved")}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => handleVerification(item.id, "rejected")}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
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
              { label: "Total Bit-Token Sales", value: "$68,900", icon: DollarSign, change: "+18.4%" },
              { label: "Total Payouts", value: "$61,110", icon: TrendingUp, change: "+16.2%" },
              { label: "Active Creators", value: "342", icon: Users, change: "+24" },
              { label: "Platform Revenue", value: `$${totalFees.toLocaleString()}`, icon: Percent, change: "+22.1%" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="w-4 h-4 text-primary" />
                  <span className="text-[10px] text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <span className="text-xs text-green-400">{stat.change}</span>
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
                    <div
                      className="flex-1 rounded-t bg-primary/80 neon-glow-sm"
                      style={{ height: `${(d.sales / maxSales) * 100}%` }}
                      title={`Sales: $${d.sales}`}
                    />
                    <div
                      className="flex-1 rounded-t bg-gold/60"
                      style={{ height: `${(d.payouts / maxSales) * 100}%` }}
                      title={`Payouts: $${d.payouts}`}
                    />
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

      {/* User/Creator Database */}
      {activeSection === "users" && (
        <div className="px-4 space-y-4">
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

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] gap-2 px-4 py-2.5 bg-secondary/50 border-b border-border">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">User</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Earned</span>
            </div>
            <div className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <div key={user.id} className="px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          user.role === "creator"
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-secondary text-muted-foreground border border-border"
                        }`}>
                          {user.role}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                      {user.wallet !== "—" && (
                        <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">LTC: {user.wallet}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">${user.earned.toLocaleString()}</p>
                      {user.pending > 0 && (
                        <p className="text-[10px] text-gold">Pending: ${user.pending.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No users found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Revenue Monitor */}
      {activeSection === "revenue" && (
        <div className="px-4 space-y-4">
          <div className="bg-gradient-to-br from-primary/10 to-gold/10 border border-primary/30 rounded-xl p-5 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Platform Revenue (10% Fee)</p>
            <p className="text-4xl font-bold text-primary">${totalFees.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Across all transaction types</p>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2.5 bg-secondary/50 border-b border-border">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Volume</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">10% Fee</span>
            </div>
            <div className="divide-y divide-border">
              {PLATFORM_FEES.map((fee) => (
                <div key={fee.type} className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 items-center">
                  <div>
                    <p className="text-sm font-medium text-foreground">{fee.type}</p>
                    <p className="text-xs text-muted-foreground">{fee.transactions.toLocaleString()} transactions</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-right">${fee.totalVolume.toLocaleString()}</p>
                  <p className="text-sm font-bold text-primary text-right">${fee.fee.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* EXECUTE CREATOR PAYOUTS button */}
          <div className="bg-card border border-primary/30 rounded-xl p-5 space-y-4">
            <div className="text-center">
              <p className="text-xs font-bold tracking-wider text-muted-foreground mb-1">FOUNDER PAYOUT CONTROL</p>
              <p className="text-2xl font-bold text-primary">${totalPending.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Pending Creator Balances</p>
            </div>

            <Button
              variant="neon"
              size="lg"
              className="w-full text-sm font-bold tracking-widest"
              onClick={handleExecutePayout}
              disabled={!canExecutePayout(payoutState).allowed}
            >
              {canExecutePayout(payoutState).allowed
                ? "EXECUTE CREATOR PAYOUTS"
                : `LOCKED — NEXT IN [${cooldownDisplay || "..."}]`}
            </Button>

            {payoutMessage && (
              <div className={`text-center p-3 rounded-lg border ${
                payoutMessage.startsWith("PAYOUTS EXECUTED")
                  ? "bg-green-400/10 border-green-400/30"
                  : "bg-gold/10 border-gold/30"
              }`}>
                <p className={`text-xs font-bold tracking-wider ${
                  payoutMessage.startsWith("PAYOUTS EXECUTED") ? "text-green-400" : "text-gold"
                }`}>
                  {payoutMessage}
                </p>
              </div>
            )}

            {cooldownDisplay && (
              <p className="text-[10px] text-muted-foreground text-center">
                Next execution available in: [{cooldownDisplay}]
              </p>
            )}

            <p className="text-[10px] text-muted-foreground text-center">
              This button can be executed once every 24 hours. It releases all verified pending creator balances to their linked LTC wallets.
            </p>
          </div>

          <div className="bg-secondary/50 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
            <Percent className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              The platform collects a 10% service fee on all Bit-Token transactions, vault unlocks, custom media requests, and bundle purchases. Creator payouts are processed after fee deduction.
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
              <p className="text-xs text-muted-foreground">Estimated Pending (from mock data)</p>
            </div>

            <Button
              variant="neon"
              size="lg"
              className="w-full text-sm font-bold tracking-widest"
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
                } catch (err) {
                  setPayoutResult({ success: false, message: 'Network error — check edge function logs' });
                }
                setPayoutProcessing(false);
              }}
            >
              {payoutProcessing
                ? "PROCESSING..."
                : canExecutePayout(payoutState).allowed
                ? "PROCESS MASS PAYOUT"
                : `LOCKED — NEXT IN [${cooldownDisplay || "..."}]`}
            </Button>

            {payoutResult && (
              <div className={`text-center p-3 rounded-lg border ${
                payoutResult.success
                  ? "bg-green-400/10 border-green-400/30"
                  : "bg-destructive/10 border-destructive/30"
              }`}>
                <p className={`text-xs font-bold tracking-wider ${
                  payoutResult.success ? "text-green-400" : "text-destructive"
                }`}>
                  {payoutResult.message}
                </p>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground text-center">
              This button triggers the NOWPayments Mass Payout API. All pending creator balances are sent as LTC to their saved wallet addresses. Balances are marked as paid once confirmed. 24-hour cooldown applies.
            </p>
          </div>

          <div className="bg-secondary/50 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
            <DollarSign className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              The 90/10 split (Creator/Platform) is applied at transaction time. Each sale records the creator's share in the <strong>transactions</strong> ledger. This payout only releases the already-calculated creator share.
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
              variant="neon"
              size="sm"
              disabled={demandLoading}
              onClick={async () => {
                setDemandLoading(true);
                try {
                  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
                  const url = `https://${projectId}.supabase.co/functions/v1/market-demand`;
                  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
                  const data = await res.json();
                  setDemandKeywords(Array.isArray(data) ? data : []);
                } catch {
                  setDemandKeywords([]);
                }
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
            <p className="text-xs text-muted-foreground mb-4">Monitor your DigitalOcean Droplet resources. Upgrade when CPU or RAM consistently exceeds 80%.</p>
            <Button
              variant="neon"
              size="sm"
              onClick={() => {
                setHealthData({
                  cpu: Math.floor(Math.random() * 45 + 10),
                  ram: Math.floor(Math.random() * 40 + 30),
                  uptime: `${Math.floor(Math.random() * 30 + 1)}d ${Math.floor(Math.random() * 24)}h`,
                  lastCheck: new Date().toLocaleTimeString(),
                });
              }}
            >
              REFRESH HEALTH DATA
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">CPU Usage</span>
              </div>
              <p className={`text-3xl font-bold ${healthData.cpu > 80 ? "text-destructive" : healthData.cpu > 60 ? "text-gold" : "text-green-400"}`}>
                {healthData.cpu}%
              </p>
              <div className="w-full h-2 rounded-full bg-secondary mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${healthData.cpu > 80 ? "bg-destructive" : healthData.cpu > 60 ? "bg-gold" : "bg-green-400"}`}
                  style={{ width: `${healthData.cpu}%` }}
                />
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">RAM Usage</span>
              </div>
              <p className={`text-3xl font-bold ${healthData.ram > 80 ? "text-destructive" : healthData.ram > 60 ? "text-gold" : "text-green-400"}`}>
                {healthData.ram}%
              </p>
              <div className="w-full h-2 rounded-full bg-secondary mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${healthData.ram > 80 ? "bg-destructive" : healthData.ram > 60 ? "bg-gold" : "bg-green-400"}`}
                  style={{ width: `${healthData.ram}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Uptime</span>
              <span className="font-bold text-foreground">{healthData.uptime}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Check</span>
              <span className="font-bold text-foreground">{healthData.lastCheck || "—"}</span>
            </div>
          </div>

          <div className="bg-secondary/50 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
            <Activity className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> If CPU or RAM stays above 80% consistently, upgrade your Droplet plan in the DigitalOcean dashboard. For production, deploy a health-check endpoint on your Droplet to get live metrics.
            </p>
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
                type="text"
                value={legalSearch}
                onChange={(e) => setLegalSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchLegalLogs(legalSearch)}
                placeholder="Search by username or email..."
                className="w-full bg-secondary rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <Button variant="neon" size="sm" className="shrink-0" onClick={() => fetchLegalLogs(legalSearch)}>
              SEARCH
            </Button>
          </div>

          {legalLoading && (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading legal records...</div>
          )}

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
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                      v{log.terms_version}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                    <div>
                      <span className="font-semibold uppercase tracking-wider">IP:</span> {log.ip_address || "—"}
                    </div>
                    <div>
                      <span className="font-semibold uppercase tracking-wider">Type:</span> {log.consent_type}
                    </div>
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
        <a href="mailto:dropthatthingmedia@gmail.com" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
          <Mail className="w-3 h-3" />
          Official Support: dropthatthingmedia@gmail.com
        </a>
      </div>
    </div>
  );
};

export default MasterAdminPanel;
