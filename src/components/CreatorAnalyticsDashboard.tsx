import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, BarChart3, Users, Eye, TrendingUp, Upload, Shield, CreditCard,
  CheckCircle, AlertCircle, Clock, FileText, DollarSign, Image, Video, Trash2, Mail,
  Lightbulb, Lock, Globe, Camera, Download, Crown, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import WalletIndicator from "@/components/WalletIndicator";
import SuggestionBox from "@/components/SuggestionBox";
import CreatorSafetyModal from "@/components/CreatorSafetyModal";
import {
  getCreatorSplitState, formatCountdown, DEFAULT_SPLIT, INCENTIVE_SPLIT,
  type CreatorSplitState,
} from "@/lib/paymentSplit";

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

const TOP_FANS = [
  { rank: 1, name: "DiamondHands_99", spent: 2400 },
  { rank: 2, name: "VaultKing99", spent: 1800 },
  { rank: 3, name: "NeonWhale", spent: 1200 },
  { rank: 4, name: "TopTierSub", spent: 900 },
  { rank: 5, name: "CryptoFan42", spent: 600 },
];

type Section = "overview" | "verification" | "requests" | "media";

const CreatorAnalyticsDashboard = ({ onBack }: { onBack: () => void }) => {
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [verificationStatus, setVerificationStatus] = useState<"none" | "pending" | "verified">("none");
  const [idUploaded, setIdUploaded] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showSafetyModal, setShowSafetyModal] = useState(true);
  const [safetyAgreed, setSafetyAgreed] = useState(false);
  const [requestActions, setRequestActions] = useState<Record<string, "accepted" | "declined">>({});
  const [loyaltyTokens] = useState(5);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [splitState, setSplitState] = useState<CreatorSplitState>(() =>
    getCreatorSplitState("creator-1", 48200)
  );
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!splitState.incentiveActive || !splitState.incentiveEndsAt) return;
    const interval = setInterval(() => {
      const remaining = splitState.incentiveEndsAt! - Date.now();
      if (remaining <= 0) {
        setSplitState((prev) => getCreatorSplitState(prev.creatorId, prev.followerCount, prev));
        setCountdown("");
        clearInterval(interval);
      } else {
        setCountdown(formatCountdown(remaining));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [splitState.incentiveActive, splitState.incentiveEndsAt]);

  const maxEarned = Math.max(...REVENUE_DATA.map((d) => d.earned));

  const sections: { id: Section; label: string }[] = [
    { id: "overview", label: "ANALYTICS" },
    { id: "verification", label: "VERIFY" },
    { id: "requests", label: "REQUESTS" },
    { id: "media", label: "MEDIA" },
  ];

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProfileImage(url);
    }
  };

  const handleRequestAction = (id: string, action: "accepted" | "declined") => {
    setRequestActions(prev => ({ ...prev, [id]: action }));
  };

  // Show safety modal on first load
  if (showSafetyModal && !safetyAgreed) {
    return <CreatorSafetyModal onAgree={() => { setSafetyAgreed(true); setShowSafetyModal(false); }} />;
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-10 h-10 rounded-full bg-secondary border-2 border-primary/50 flex items-center justify-center overflow-hidden group"
          >
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfileUpload} />
          <h1 className="text-lg font-bold text-foreground tracking-wider font-display">DASHBOARD</h1>
        </div>
        <WalletIndicator />
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

      {/* Payment Split Banner */}
      <div className="mx-4 mb-4 bg-card border border-primary/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold tracking-wider text-foreground">REVENUE SPLIT</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            splitState.incentiveActive
              ? "bg-primary/20 text-primary border border-primary/30"
              : "bg-secondary text-muted-foreground"
          }`}>
            {splitState.currentSplit.creator}/{splitState.currentSplit.platform}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden mb-2">
          <div
            className="h-full bg-primary rounded-full neon-glow-sm transition-all duration-500"
            style={{ width: `${splitState.currentSplit.creator}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Creator: {splitState.currentSplit.creator}%</span>
          <span>Platform: {splitState.currentSplit.platform}%</span>
        </div>
        {splitState.incentiveActive && countdown && (
          <div className="mt-3 bg-primary/10 border border-primary/20 rounded-lg p-3 text-center space-y-1">
            <p className="text-xs font-bold text-primary tracking-wider">97/3 INCENTIVE ACTIVE: [{countdown}]</p>
            <p className="text-[10px] text-muted-foreground">90/10 LOGIC RESUMES IN: [{countdown}]</p>
          </div>
        )}
        {!splitState.milestoneReached && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Reach 100K followers to unlock the 97/3 incentive split for 7 days
          </p>
        )}
      </div>

      {/* Strategy Tip & Loyalty Tokens */}
      <div className="mx-4 mb-4 flex gap-3">
        <div className="flex-1 bg-gradient-to-r from-primary/10 to-gold/10 border border-primary/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4 text-gold" />
            <h4 className="text-xs font-bold text-foreground">Strategy Tip</h4>
          </div>
          <p className="text-[10px] text-muted-foreground">Upload a 15-sec teaser, lock your full content behind a paywall.</p>
        </div>
        <div className="bg-card border border-gold/30 rounded-xl p-3 text-center gold-glow">
          <Crown className="w-4 h-4 text-gold mx-auto mb-1" />
          <p className="text-xs font-bold text-gold">{loyaltyTokens}</p>
          <p className="text-[10px] text-muted-foreground">Loyalty Tokens</p>
          <p className="text-[8px] text-muted-foreground/60">Gift to fans</p>
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
                  <div className="w-full flex items-end gap-0.5" style={{ height: "100%" }}>
                    <div className="flex-1 rounded-t bg-primary/80 neon-glow-sm" style={{ height: `${(d.earned / maxEarned) * 100}%` }} />
                    <div className="flex-1 rounded-t bg-gold/60" style={{ height: `${(d.withdrawn / maxEarned) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{d.month}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-primary/80" /><span className="text-[10px] text-muted-foreground">Earned</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-gold/60" /><span className="text-[10px] text-muted-foreground">Withdrawn</span></div>
            </div>
          </div>

          {/* Top Fan List */}
          <div className="bg-card border border-gold/30 rounded-xl p-4 gold-glow">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-gold" />
              <h3 className="text-sm font-bold text-foreground">Top 5 Spenders</h3>
            </div>
            <div className="space-y-2">
              {TOP_FANS.map(fan => (
                <div key={fan.rank} className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-5 text-right ${fan.rank <= 3 ? "text-gold" : "text-muted-foreground"}`}>{fan.rank}</span>
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-primary">
                    {fan.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs text-foreground flex-1">@{fan.name}</span>
                  <span className="text-xs font-bold text-gold">${fan.spent}</span>
                </div>
              ))}
            </div>
          </div>

          {/* QR Code Section */}
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <h3 className="text-sm font-bold text-foreground mb-2">SHARE MY VAULT</h3>
            <div className="w-32 h-32 mx-auto bg-foreground rounded-lg p-2 mb-3" style={{ border: "3px solid hsl(var(--primary))" }}>
              <div className="w-full h-full bg-background rounded flex items-center justify-center">
                <div className="grid grid-cols-5 gap-0.5">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div key={i} className={`w-4 h-4 ${[0,1,3,4,5,9,10,14,15,19,20,21,23,24].includes(i) ? "bg-foreground" : "bg-background"}`} />
                  ))}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">dropthatthing.com/creator/username</p>
            <Button variant="neon" size="sm" className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              DOWNLOAD QR CODE
            </Button>
          </div>

          {/* Recent Activity */}
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

          {/* Suggestion Box */}
          <SuggestionBox />
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
              <p className="text-xs text-muted-foreground">Upload a valid government-issued ID to verify your identity and age.</p>
            </div>
            <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-3 hover:border-primary/40 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Identity & Age Documents</p>
              <p className="text-xs text-muted-foreground text-center">Government-issued ID, Passport, or Driver's License</p>
              <Button variant={idUploaded ? "outline" : "neon"} size="sm" onClick={() => { setIdUploaded(true); setVerificationStatus("pending"); }}>
                {idUploaded ? "Re-upload" : "Upload Documents"}
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-2 bg-secondary/50 rounded-lg p-3">
              {verificationStatus === "verified" ? (
                <><CheckCircle className="w-4 h-4 text-green-400" /><p className="text-xs text-muted-foreground">Status: <span className="text-green-400 font-medium">Verified ✓</span></p></>
              ) : verificationStatus === "pending" ? (
                <><Clock className="w-4 h-4 text-gold" /><p className="text-xs text-muted-foreground">Status: <span className="text-gold font-medium">Pending Review</span></p></>
              ) : (
                <><AlertCircle className="w-4 h-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Status: <span className="text-muted-foreground font-medium">Not Submitted</span></p></>
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
            <Button variant="neon" className="w-full mt-4">Request Payout</Button>
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
              {CUSTOM_REQUESTS.map((req) => {
                const action = requestActions[req.id];
                const displayStatus = action ?? req.status;
                return (
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
                        displayStatus === "pending" ? "bg-gold/10 text-gold border border-gold/30" :
                        displayStatus === "accepted" ? "bg-primary/10 text-primary border border-primary/30" :
                        displayStatus === "declined" ? "bg-destructive/10 text-destructive border border-destructive/30" :
                        "bg-green-400/10 text-green-400 border border-green-400/30"
                      }`}>
                        {displayStatus === "pending" ? "Awaiting Response" : displayStatus === "accepted" ? "In Progress" : displayStatus === "declined" ? "Declined" : "Completed"}
                      </span>
                      {displayStatus === "pending" && (
                        <div className="flex gap-2">
                          <Button variant="neon" size="sm" onClick={() => handleRequestAction(req.id, "accepted")}>
                            ACCEPT & CREATE
                          </Button>
                          <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={() => handleRequestAction(req.id, "declined")}>
                            DECLINE
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Media Manager */}
      {activeSection === "media" && (
        <div className="px-4 space-y-6">
          {/* Profile Trailer Upload */}
          <div className="bg-card border border-primary/30 rounded-xl p-4">
            <h3 className="text-sm font-bold text-foreground mb-2">PROFILE TRAILER (15s)</h3>
            <p className="text-xs text-muted-foreground mb-3">This video loops at the top of your locked profile. Only media visible to non-paying users.</p>
            <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary/50 transition-colors">
              <Upload className="w-6 h-6 text-primary" />
              <Button variant="neon" size="sm">UPLOAD PROFILE TRAILER</Button>
              <p className="text-[10px] text-muted-foreground">MP4, max 15 seconds</p>
            </div>
          </div>

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
            <div className="space-y-3">
              {PUBLIC_TEASERS.map((item) => (
                <div key={item.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <Video className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <span className="text-xs text-muted-foreground">{item.views.toLocaleString()} views • {item.date}</span>
                  </div>
                  <button className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
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
            <div className="space-y-3">
              {VAULT_CONTENT.map((item) => (
                <div key={item.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    {item.type === "video" ? <Video className="w-6 h-6 text-gold" /> : <Image className="w-6 h-6 text-gold" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <span className="text-xs text-muted-foreground">{item.views.toLocaleString()} views • {item.date}</span>
                  </div>
                  <button className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Music & Trailer Upload */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-bold text-foreground mb-2">MUSIC & TRAILER</h3>
            <p className="text-xs text-muted-foreground mb-3">Upload your 15-second MP4 with audio baked in for the Discovery Feed.</p>
            <Button variant="neon" size="sm" className="gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              UPLOAD TRAILER WITH AUDIO
            </Button>
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
