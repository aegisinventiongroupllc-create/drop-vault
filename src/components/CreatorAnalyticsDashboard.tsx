import { useState } from "react";
import {
  ArrowLeft, BarChart3, Users, Eye, TrendingUp, Upload, Shield, CreditCard,
  CheckCircle, AlertCircle, Clock, FileText, DollarSign, Image, Video, Trash2, Mail,
  Lightbulb, Lock, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import WalletIndicator from "@/components/WalletIndicator";

const STATS = [
  { label: "Followers", value: "48.2K", change: "+2.3%", icon: Users },
  { label: "Total Views", value: "1.8M", change: "+12.5%", icon: Eye },
  { label: "Bit-Token Revenue", value: "2,450 BT", change: "+8.1%", icon: BarChart3 },
  { label: "Growth Rate", value: "15.4%", change: "+3.2%", icon: TrendingUp },
];

const REVENUE_DATA = [
  { month: "Jan", earned: 320, withdrawn: 200 },
  { month: "Feb", earned: 480, withdrawn: 350 },
  { month: "Mar", earned: 620, withdrawn: 400 },
  { month: "Apr", earned: 750, withdrawn: 500 },
  { month: "May", earned: 890, withdrawn: 600 },
  { month: "Jun", earned: 1100, withdrawn: 780 },
];

const CUSTOM_REQUESTS = [
  { id: "1", fan: "VaultKing99", description: "Custom cosplay photoshoot — Tifa Lockhart", amount: 500, status: "pending" as const },
  { id: "2", fan: "NeonWhale", description: "Exclusive gym workout video — 10 min", amount: 250, status: "pending" as const },
  { id: "3", fan: "DiamondFan", description: "Premium behind-the-scenes content", amount: 1000, status: "accepted" as const },
  { id: "4", fan: "TopTierSub", description: "Custom GRWM video", amount: 150, status: "completed" as const },
];

const PUBLIC_TEASERS = [
  { id: "t1", type: "video" as const, title: "Cosplay Reveal — 15s Teaser", views: 42300, date: "Apr 2", visibility: "public" as const },
  { id: "t2", type: "video" as const, title: "Gym Motivation — Teaser", views: 18900, date: "Mar 30", visibility: "public" as const },
];

const VAULT_CONTENT = [
  { id: "v1", type: "video" as const, title: "Cosplay Full Shoot — 18 min", views: 12400, date: "Apr 2", visibility: "locked" as const },
  { id: "v2", type: "photo" as const, title: "Beach Shoot — Full Set (24 photos)", views: 8900, date: "Mar 28", visibility: "locked" as const },
  { id: "v3", type: "video" as const, title: "Gym Session #12 — Full 22 min", views: 6200, date: "Mar 25", visibility: "locked" as const },
  { id: "v4", type: "photo" as const, title: "BTS — Studio Lighting Set", views: 4300, date: "Mar 20", visibility: "locked" as const },
  { id: "v5", type: "video" as const, title: "Q&A Uncut — 45 min", views: 15600, date: "Mar 18", visibility: "locked" as const },
];

type Section = "overview" | "verification" | "requests" | "media";

const CreatorAnalyticsDashboard = ({ onBack }: { onBack: () => void }) => {
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [verificationStatus, setVerificationStatus] = useState<"none" | "pending" | "verified">("none");
  const [idUploaded, setIdUploaded] = useState(false);

  const maxEarned = Math.max(...REVENUE_DATA.map((d) => d.earned));

  const sections: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Analytics", icon: BarChart3 },
    { id: "verification", label: "Verify", icon: Shield },
    { id: "requests", label: "Requests", icon: FileText },
    { id: "media", label: "Media", icon: Image },
  ];

  return (
    <div className="min-h-screen pb-24">
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

      {/* Strategy Tip Banner */}
      <div className="mx-4 mb-4 bg-gradient-to-r from-primary/10 to-gold/10 border border-primary/30 rounded-xl p-4 flex gap-3">
        <Lightbulb className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-foreground mb-1">Strategy Tip</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Maximize your Revenue: Upload a high-energy 15-second teaser to the public feed, then lock your full 15+ minute exclusive videos behind your Profile Paywall.
          </p>
        </div>
      </div>

      {/* Analytics Overview */}
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

          {/* Revenue Chart */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Bit-Token Revenue</h3>
            <p className="text-xs text-muted-foreground mb-4">Earned vs. Withdrawn</p>
            <div className="flex items-end gap-3 h-36">
              {REVENUE_DATA.map((d) => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center gap-0.5" style={{ height: "100%" }}>
                    <div className="w-full flex items-end gap-0.5" style={{ height: "100%" }}>
                      <div
                        className="flex-1 rounded-t bg-primary/80 neon-glow-sm"
                        style={{ height: `${(d.earned / maxEarned) * 100}%` }}
                        title={`Earned: ${d.earned} BT`}
                      />
                      <div
                        className="flex-1 rounded-t bg-gold/60"
                        style={{ height: `${(d.withdrawn / maxEarned) * 100}%` }}
                        title={`Withdrawn: ${d.withdrawn} BT`}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{d.month}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-primary/80" />
                <span className="text-[10px] text-muted-foreground">Earned</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-gold/60" />
                <span className="text-[10px] text-muted-foreground">Withdrawn</span>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
            {[
              { text: "New vault unlock — Cosplay Vault", time: "2m ago", icon: CheckCircle },
              { text: "Custom request received — $500", time: "15m ago", icon: CreditCard },
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

      {/* Verification Center */}
      {activeSection === "verification" && (
        <div className="px-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Verification Center</h3>
            </div>

            <div className="bg-secondary/50 border border-primary/20 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Upload a valid government-issued ID to verify your identity and age. Required before receiving payouts or accepting custom requests.
              </p>
            </div>

            {/* Upload button */}
            <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-3 hover:border-primary/40 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Identity & Age Documents</p>
              <p className="text-xs text-muted-foreground text-center">Government-issued ID, Passport, or Driver's License</p>
              <Button
                variant={idUploaded ? "outline" : "neon"}
                size="sm"
                onClick={() => {
                  setIdUploaded(true);
                  setVerificationStatus("pending");
                }}
              >
                {idUploaded ? "Re-upload" : "Upload Documents"}
              </Button>
            </div>

            {/* Status */}
            <div className="mt-4 flex items-center gap-2 bg-secondary/50 rounded-lg p-3">
              {verificationStatus === "verified" ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <p className="text-xs text-muted-foreground">
                    Status: <span className="text-green-400 font-medium">Verified ✓</span>
                  </p>
                </>
              ) : verificationStatus === "pending" ? (
                <>
                  <Clock className="w-4 h-4 text-gold" />
                  <p className="text-xs text-muted-foreground">
                    Status: <span className="text-gold font-medium">Pending Review</span>
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Status: <span className="text-muted-foreground font-medium">Not Submitted</span>
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Payout Settings */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Payout Settings</h3>
            </div>

            <div className="bg-secondary/50 rounded-xl p-4 mb-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
              <p className="text-3xl font-bold text-primary">$2,340.00</p>
              <p className="text-xs text-muted-foreground mt-1">Min. payout: $50.00</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">LTC (Litecoin) Wallet Address</label>
              <input
                type="text"
                placeholder="Enter your Litecoin wallet address (e.g. ltc1q...)"
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">Payouts are sent exclusively via Litecoin (LTC)</p>
            </div>

            <Button variant="neon" className="w-full mt-4">
              Request Payout
            </Button>
          </div>
        </div>
      )}

      {/* Request Vault */}
      {activeSection === "requests" && (
        <div className="px-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">The Request Vault</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Custom Media Requests from fans</p>

            <div className="space-y-3">
              {CUSTOM_REQUESTS.map((req) => (
                <div key={req.id} className="border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{req.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">From: {req.fan}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-primary/10 border border-primary/30 rounded-full px-2.5 py-1">
                      <DollarSign className="w-3 h-3 text-primary" />
                      <span className="text-sm font-bold text-primary">{req.amount}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      req.status === "pending" ? "bg-gold/10 text-gold border border-gold/30" :
                      req.status === "accepted" ? "bg-primary/10 text-primary border border-primary/30" :
                      "bg-green-400/10 text-green-400 border border-green-400/30"
                    }`}>
                      {req.status === "pending" ? "Awaiting Response" : req.status === "accepted" ? "In Progress" : "Completed"}
                    </span>
                    {req.status === "pending" && (
                      <Button variant="neon" size="sm">Accept & Create</Button>
                    )}
                    {req.status === "accepted" && (
                      <Button variant="neon" size="sm">Submit Content</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-secondary/50 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
            <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              All payments are held in secure escrow until content is delivered and verified. Funds are released within 48 hours of approval.
            </p>
          </div>
        </div>
      )}

      {/* Media Manager */}
      {activeSection === "media" && (
        <div className="px-4 space-y-6">
          {/* Public Teasers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <h3 className="text-base font-semibold text-foreground">Public Teasers</h3>
              </div>
              <Button variant="neon" size="sm" className="gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                Upload Teaser
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Short previews visible on the public discovery feed.</p>
            <div className="space-y-3">
              {PUBLIC_TEASERS.map((item) => (
                <div key={item.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <Video className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{item.views.toLocaleString()} views</span>
                      <span className="text-xs text-muted-foreground">• {item.date}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium mt-1">
                      <Globe className="w-2.5 h-2.5" /> Public
                    </span>
                  </div>
                  <button className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Locked Vault Content */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-gold" />
                <h3 className="text-base font-semibold text-foreground">Locked Vault Content</h3>
              </div>
              <Button variant="gold" size="sm" className="gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                Upload to Vault
              </Button>
            </div>
            <div className="bg-secondary/50 border border-gold/20 rounded-lg p-3 mb-3 flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-gold flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Vault content is only visible to customers who have unlocked your profile with a Bit-Token or the 14-day access fee.
              </p>
            </div>
            <div className="space-y-3">
              {VAULT_CONTENT.map((item) => (
                <div key={item.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    {item.type === "video" ? (
                      <Video className="w-6 h-6 text-gold" />
                    ) : (
                      <Image className="w-6 h-6 text-gold" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{item.views.toLocaleString()} views</span>
                      <span className="text-xs text-muted-foreground">• {item.date}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] text-gold font-medium mt-1">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  </div>
                  <button className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
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

export default CreatorAnalyticsDashboard;
