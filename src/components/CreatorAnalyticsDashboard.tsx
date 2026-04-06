import { useState } from "react";
import {
  ArrowLeft, BarChart3, Users, Eye, TrendingUp, Upload, Shield, CreditCard, CheckCircle, AlertCircle, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import WalletIndicator from "@/components/WalletIndicator";

const STATS = [
  { label: "Followers", value: "48.2K", change: "+2.3%", icon: Users },
  { label: "Total Views", value: "1.8M", change: "+12.5%", icon: Eye },
  { label: "Vault Revenue", value: "$12,450", change: "+8.1%", icon: BarChart3 },
  { label: "Growth Rate", value: "15.4%", change: "+3.2%", icon: TrendingUp },
];

const WEEKLY_DATA = [
  { day: "Mon", views: 45 },
  { day: "Tue", views: 62 },
  { day: "Wed", views: 78 },
  { day: "Thu", views: 55 },
  { day: "Fri", views: 91 },
  { day: "Sat", views: 110 },
  { day: "Sun", views: 86 },
];

const CreatorAnalyticsDashboard = ({ onBack }: { onBack: () => void }) => {
  const [activeSection, setActiveSection] = useState<"overview" | "verification" | "payouts">("overview");
  const [idFront, setIdFront] = useState<string | null>(null);
  const [idBack, setIdBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState("");

  const maxViews = Math.max(...WEEKLY_DATA.map((d) => d.views));

  const sections = [
    { id: "overview" as const, label: "Overview", icon: BarChart3 },
    { id: "verification" as const, label: "Identity", icon: Shield },
    { id: "payouts" as const, label: "Payouts", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Creator Dashboard</h1>
        </div>
        <WalletIndicator />
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto scrollbar-hide">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeSection === s.id
                ? "bg-primary text-primary-foreground neon-glow-sm"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <s.icon className="w-3.5 h-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeSection === "overview" && (
        <div className="px-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <span className="text-xs text-green-400">{stat.change} this week</span>
              </div>
            ))}
          </div>

          {/* Mini chart */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Weekly Views</h3>
            <div className="flex items-end gap-2 h-32">
              {WEEKLY_DATA.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary/80 neon-glow-sm transition-all"
                    style={{ height: `${(d.views / maxViews) * 100}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
            {[
              { text: "New vault unlock — Cosplay Vault", time: "2m ago", icon: CheckCircle },
              { text: "Custom request received — $250", time: "15m ago", icon: CreditCard },
              { text: "+124 new followers today", time: "1h ago", icon: Users },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <a.icon className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{a.text}</p>
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Identity & Age Verification */}
      {activeSection === "verification" && (
        <div className="px-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Identity & Age Verification</h3>
            </div>

            <div className="bg-secondary/50 border border-primary/20 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Upload a valid government-issued ID to verify your identity and age. This is required before you can receive payouts.
              </p>
            </div>

            {/* Upload slots */}
            <div className="space-y-3">
              {[
                { label: "Government ID — Front", state: idFront, setter: setIdFront },
                { label: "Government ID — Back", state: idBack, setter: setIdBack },
                { label: "Selfie with ID", state: selfie, setter: setSelfie },
              ].map((slot) => (
                <div key={slot.label} className="border border-border rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {slot.state ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{slot.label}</p>
                      <p className="text-xs text-muted-foreground">{slot.state ? "Uploaded" : "Required"}</p>
                    </div>
                  </div>
                  <Button
                    variant={slot.state ? "outline" : "default"}
                    size="sm"
                    onClick={() => slot.setter("uploaded")}
                  >
                    {slot.state ? "Replace" : "Upload"}
                  </Button>
                </div>
              ))}
            </div>

            {/* Status */}
            <div className="mt-4 flex items-center gap-2 bg-secondary/50 rounded-lg p-3">
              <Clock className="w-4 h-4 text-gold" />
              <p className="text-xs text-muted-foreground">
                Verification status: <span className="text-gold font-medium">Pending Review</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payout Settings */}
      {activeSection === "payouts" && (
        <div className="px-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Payout Settings</h3>
            </div>

            {/* Balance */}
            <div className="bg-secondary/50 rounded-xl p-4 mb-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
              <p className="text-3xl font-bold text-primary">$2,340.00</p>
              <p className="text-xs text-muted-foreground mt-1">Min. payout: $50.00</p>
            </div>

            {/* Wallet address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">External Wallet Address</label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter your wallet or payout address..."
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-muted-foreground">Supports crypto wallets and bank transfer details</p>
            </div>

            <Button variant="neon" className="w-full mt-4">
              Request Payout
            </Button>

            {/* History */}
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Payout History</h4>
              {[
                { amount: "$1,200.00", date: "Mar 28, 2026", status: "Completed" },
                { amount: "$890.00", date: "Mar 14, 2026", status: "Completed" },
                { amount: "$650.00", date: "Feb 28, 2026", status: "Completed" },
              ].map((p, i) => (
                <div key={i} className="flex items-center justify-between border border-border rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.amount}</p>
                    <p className="text-xs text-muted-foreground">{p.date}</p>
                  </div>
                  <span className="text-xs text-green-400 font-medium">{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorAnalyticsDashboard;
