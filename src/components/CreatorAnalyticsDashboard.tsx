import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, BarChart3, Users, Eye, TrendingUp, Upload, Shield, CreditCard,
  CheckCircle, AlertCircle, Clock, FileText, DollarSign, Image, Video, Trash2, Mail,
  Lightbulb, Lock, Globe, Camera, Download, Crown, Loader2, Search, Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import WalletIndicator from "@/components/WalletIndicator";
import SuggestionBox from "@/components/SuggestionBox";
import LegalFooter from "@/components/LegalFooter";
import CreatorSafetyModal from "@/components/CreatorSafetyModal";
import { uploadMedia, type MediaBucket } from "@/lib/storageUpload";
import {
  getCreatorSplitState, formatCountdown, getMilestoneProgress, FOLLOWER_MILESTONE,
  DEFAULT_SPLIT, INCENTIVE_SPLIT,
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
  { id: "1", fan: "VaultKing99", description: "Custom cosplay photoshoot — Tifa Lockhart", amount: 500, status: "pending" as const, tokenPrice: 0, declineReason: "" },
  { id: "2", fan: "NeonWhale", description: "Exclusive gym workout video — 10 min", amount: 250, status: "pending" as const, tokenPrice: 0, declineReason: "" },
  { id: "3", fan: "DiamondFan", description: "Premium behind-the-scenes content", amount: 1000, status: "accepted" as const, tokenPrice: 50, declineReason: "" },
  { id: "4", fan: "TopTierSub", description: "Custom GRWM video", amount: 150, status: "completed" as const, tokenPrice: 8, declineReason: "" },
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

// Mock follower list for loyalty gifting
const FOLLOWERS_LIST = [
  "DiamondHands_99", "VaultKing99", "NeonWhale", "TopTierSub", "CryptoFan42",
  "LoyalViewer01", "SilentSupporter", "MidnightFan", "GoldenBoy22", "StarGazer99",
];

type Section = "overview" | "verification" | "requests" | "media";

const CreatorAnalyticsDashboard = ({ onBack }: { onBack: () => void }) => {
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [verificationStatus, setVerificationStatus] = useState<"none" | "pending" | "verified" | "failed">("none");
  const [idUploaded, setIdUploaded] = useState(false);
  const [ltcAddress, setLtcAddress] = useState("");
  const [ltcError, setLtcError] = useState("");
  const [ltcSaved, setLtcSaved] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showSafetyModal, setShowSafetyModal] = useState(true);
  const [safetyAgreed, setSafetyAgreed] = useState(false);
  const [requestActions, setRequestActions] = useState<Record<string, { action: "accepted" | "declined"; tokenPrice?: number; reason?: string }>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const teaserInputRef = useRef<HTMLInputElement>(null);
  const mediaTargetRef = useRef<MediaBucket>("teasers");

  // Loyalty gift state
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [loyaltySearch, setLoyaltySearch] = useState("");
  const [loyaltyTarget, setLoyaltyTarget] = useState<string | null>(null);
  const [loyaltySent, setLoyaltySent] = useState(false);
  const [remainingLoyalty, setRemainingLoyalty] = useState(25); // 5 tokens × 5 bits each = 25 bits available

  // Request response state
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseTokenPrice, setResponseTokenPrice] = useState("");
  const [responseDeclineReason, setResponseDeclineReason] = useState("");

  const [splitState, setSplitState] = useState<CreatorSplitState>(() =>
    getCreatorSplitState("creator-1", 48200)
  );
  const [countdown, setCountdown] = useState("");

  const milestoneProgress = getMilestoneProgress(splitState.followerCount);

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

  // Camera helpers for ID verification
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
    } catch {
      setShowCamera(false);
      alert("Camera access denied. Please allow camera access to verify your ID.");
    }
  };
  const capturePhoto = () => {
    if (!cameraVideoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = cameraVideoRef.current.videoWidth;
    canvas.height = cameraVideoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(cameraVideoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    setIdUploaded(true);
    setVerificationStatus("pending");
  };
  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    setShowCamera(false);
  };

  // LTC address validation
  const validateLtcAddress = (val: string) => {
    if (!val) return "";
    if (/^(ltc1|[LM3])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(val)) return "";
    return "Invalid LTC address. Must start with L, M, or ltc1.";
  };

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

  const handleRequestAction = (id: string, action: "accepted" | "declined", tokenPrice?: number, reason?: string) => {
    setRequestActions(prev => ({ ...prev, [id]: { action, tokenPrice, reason } }));
    setRespondingTo(null);
    setResponseTokenPrice("");
    setResponseDeclineReason("");
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const bucket = mediaTargetRef.current;
    setUploading(bucket);
    setUploadMsg("");
    const userId = "creator-1";
    const result = await uploadMedia(file, bucket, userId);
    if ("error" in result) {
      setUploadMsg(`Upload failed: ${result.error}`);
    } else {
      setUploadMsg(`Uploaded to ${bucket}: ${file.name}`);
    }
    setUploading(null);
    e.target.value = "";
  };

  const handleTeaserUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading("teasers");
    setUploadMsg("");
    const userId = "creator-1";
    // Upload new teaser — old one is auto-replaced in cloud storage (same path)
    const result = await uploadMedia(file, "teasers", userId, "profile-trailer");
    if ("error" in result) {
      setUploadMsg(`Upload failed: ${result.error}`);
    } else {
      setUploadMsg(`✓ Teaser uploaded with audio: ${file.name}. Old teaser moved to your library.`);
    }
    setUploading(null);
    e.target.value = "";
  };

  const triggerMediaUpload = (bucket: MediaBucket) => {
    mediaTargetRef.current = bucket;
    mediaInputRef.current?.click();
  };

  const filteredFollowers = FOLLOWERS_LIST.filter(f =>
    f.toLowerCase().includes(loyaltySearch.toLowerCase())
  );

  if (showSafetyModal && !safetyAgreed) {
    return <CreatorSafetyModal onAgree={() => { setSafetyAgreed(true); setShowSafetyModal(false); }} />;
  }

  const mediaUploadInput = (
    <>
      <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaUpload} />
      <input ref={teaserInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleTeaserUpload} />
    </>
  );

  return (
    <div className="min-h-screen pb-24">
      {mediaUploadInput}
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
            <p className="text-xs font-bold text-primary tracking-wider">⚡ 97/3 POWER WEEK ACTIVE</p>
            <p className="text-2xl font-bold text-primary font-mono">{countdown}</p>
            <p className="text-[10px] text-muted-foreground">Fee reverts to 10% when timer hits zero</p>
          </div>
        )}
        {!splitState.incentiveActive && (
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Progress to next 100K milestone</span>
              <span>{splitState.followerCount.toLocaleString()} / {splitState.nextMilestone.toLocaleString()}</span>
            </div>
            <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
                style={{ width: `${milestoneProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Every 100K new followers unlocks a 7-day Power Week (97/3 split)
            </p>
          </div>
        )}
      </div>

      {/* Strategy Tip & Loyalty Gift (5 BIT TOKENS) */}
      <div className="mx-4 mb-4 flex gap-3">
        <div className="flex-1 bg-gradient-to-r from-primary/10 to-gold/10 border border-primary/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4 text-gold" />
            <h4 className="text-xs font-bold text-foreground">Strategy Tip</h4>
          </div>
          <p className="text-[10px] text-muted-foreground">Upload a 15-sec teaser with audio, lock your full content behind a paywall.</p>
        </div>
        <button
          onClick={() => setShowLoyaltyModal(true)}
          className="bg-card border border-gold/30 rounded-xl p-3 text-center gold-glow min-w-[120px] hover:border-gold/50 transition-all"
        >
          <Gift className="w-5 h-5 text-gold mx-auto mb-1" />
          <p className="text-xs font-bold text-gold">5 LOYALTY BITS</p>
          <p className="text-[10px] text-muted-foreground">Gift to a follower</p>
        </button>
      </div>

      {/* Loyalty Modal */}
      {showLoyaltyModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card border border-gold/30 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-sm font-bold text-foreground tracking-wider">GIFT 5 LOYALTY BIT-TOKENS</h2>
              <button onClick={() => { setShowLoyaltyModal(false); setLoyaltyTarget(null); setLoyaltySent(false); setLoyaltySearch(""); }} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">Search and select a follower to gift 5 Bit-Tokens from your balance.</p>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={loyaltySearch}
                  onChange={(e) => { setLoyaltySearch(e.target.value); setLoyaltyTarget(null); setLoyaltySent(false); }}
                  placeholder="Search follower..."
                  className="w-full bg-secondary rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>

              {/* Follower list */}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredFollowers.map(follower => (
                  <button
                    key={follower}
                    onClick={() => setLoyaltyTarget(follower)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      loyaltyTarget === follower
                        ? "bg-gold/20 text-gold border border-gold/30"
                        : "bg-secondary/50 text-foreground hover:bg-secondary"
                    }`}
                  >
                    @{follower}
                  </button>
                ))}
                {filteredFollowers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No followers found</p>
                )}
              </div>

              {loyaltyTarget && !loyaltySent && (
                <div className="bg-gold/10 border border-gold/30 rounded-xl p-3 text-center">
                  <p className="text-xs text-foreground mb-2">
                    Gift <span className="text-gold font-bold">5 Bit-Tokens</span> to <span className="text-foreground font-bold">@{loyaltyTarget}</span>?
                  </p>
                  <p className="text-[10px] text-muted-foreground mb-3">5 tokens will be deducted from your balance and added to theirs.</p>
                  <Button
                    variant="gold"
                    size="sm"
                    className="w-full"
                    disabled={remainingLoyalty < 5}
                    onClick={() => {
                      setRemainingLoyalty(prev => prev - 5);
                      setLoyaltySent(true);
                    }}
                  >
                    CONFIRM GIFT — 5 BIT-TOKENS
                  </Button>
                </div>
              )}

              {loyaltySent && (
                <div className="bg-green-400/10 border border-green-400/30 rounded-xl p-3 text-center">
                  <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-green-400">LOYALTY REWARD SENT!</p>
                  <p className="text-[10px] text-muted-foreground mt-1">@{loyaltyTarget} received 5 Bit-Tokens</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

          {/* Revenue Split Info Box */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold tracking-wider text-foreground">PAYOUT STRUCTURE</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Standard Payout: 90/10 Split.</span>{" "}
              Includes a flat <span className="font-semibold text-foreground">$1.00 Network Tax</span> per request.
              Custom requests ($500–$10,001): same $1 fee + 10% of base.
            </p>
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

          <SuggestionBox />
        </div>
      )}

      {/* Verification Center */}
      {activeSection === "verification" && (
        <div className="px-4 space-y-4">
          {/* ID Verification */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Identity Verification</h3>
            </div>
            <div className="bg-secondary/50 border border-primary/20 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">Use your device camera to take a live photo of your government-issued ID for automatic age & identity verification.</p>
            </div>

            {/* Camera viewfinder */}
            {showCamera && (
              <div className="relative rounded-xl overflow-hidden mb-4 border-2 border-primary/40">
                <video ref={cameraVideoRef} autoPlay playsInline muted className="w-full aspect-[4/3] bg-black object-cover" />
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                  <Button variant="neon" size="sm" onClick={capturePhoto}>
                    <Camera className="w-4 h-4 mr-1" /> CAPTURE
                  </Button>
                  <Button variant="outline" size="sm" onClick={stopCamera}>CANCEL</Button>
                </div>
              </div>
            )}

            {/* Captured preview */}
            {capturedImage && !showCamera && (
              <div className="relative rounded-xl overflow-hidden mb-4 border border-border">
                <img src={capturedImage} alt="Captured ID" className="w-full aspect-[4/3] object-cover" />
                <div className="absolute top-2 right-2 bg-gold/90 text-black text-[10px] font-bold px-2 py-1 rounded">
                  SUBMITTED
                </div>
              </div>
            )}

            {!showCamera && !capturedImage && (
              <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-3 hover:border-primary/40 transition-colors">
                <Camera className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Live ID Photo Required</p>
                <p className="text-xs text-muted-foreground text-center">Government-issued ID, Passport, or Driver's License</p>
                <Button variant="neon" size="sm" onClick={startCamera}>
                  <Camera className="w-4 h-4 mr-1" /> OPEN CAMERA
                </Button>
              </div>
            )}

            {/* Status */}
            <div className="mt-4 flex items-center gap-2 bg-secondary/50 rounded-lg p-3">
              {verificationStatus === "verified" ? (
                <><CheckCircle className="w-4 h-4 text-green-400" /><p className="text-xs text-muted-foreground">Status: <span className="text-green-400 font-medium">Verified ✓</span> — Automatically approved</p></>
              ) : verificationStatus === "failed" ? (
                <><AlertCircle className="w-4 h-4 text-destructive" /><p className="text-xs text-muted-foreground">Status: <span className="text-destructive font-medium">Failed — Flagged for Admin Review</span></p></>
              ) : verificationStatus === "pending" ? (
                <><Clock className="w-4 h-4 text-gold" /><p className="text-xs text-muted-foreground">Status: <span className="text-gold font-medium">Processing — Automated Scan in Progress</span></p></>
              ) : (
                <><AlertCircle className="w-4 h-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Status: <span className="text-muted-foreground font-medium">Not Submitted</span></p></>
              )}
            </div>
          </div>

          {/* Payout Wallet Address (LTC) */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold text-foreground uppercase tracking-wider">Payout Wallet Address (LTC)</h3>
            </div>
            <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 mb-4">
              <p className="text-sm font-bold text-gold text-center tracking-wide">WE PAYOUT VIA LTC ONLY.</p>
              <p className="text-sm font-bold text-gold text-center tracking-wide">SUBMIT YOUR LITECOIN ADDRESS BELOW.</p>
              <p className="text-[10px] text-muted-foreground text-center mt-2">All payouts are sent as Litecoin. Settlements take 4–5 business days.</p>
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
                value={ltcAddress}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  setLtcAddress(val);
                  setLtcSaved(false);
                  setLtcError(validateLtcAddress(val));
                }}
                placeholder="e.g. ltc1q... or L... or M..."
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-xs"
              />
              {ltcError && <p className="text-xs text-destructive">{ltcError}</p>}
              {ltcSaved && <p className="text-xs text-green-400 font-bold">✓ Wallet address saved and synced to Admin Panel</p>}
              <p className="text-[10px] text-muted-foreground">⚠ LTC ONLY — YOU ARE RESPONSIBLE FOR LOCAL TAX REPORTING.</p>
            </div>
            <Button variant="neon" className="w-full mt-4" disabled={!ltcAddress || !!ltcError} onClick={() => setLtcSaved(true)}>
              SAVE WALLET ADDRESS
            </Button>
          </div>

          {/* Revenue Split Info */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground text-center">
              <span className="font-bold text-foreground">Standard Payout: 90/10 Split.</span>{" "}
              Includes a flat $1.00 Network Tax per request.
            </p>
          </div>
        </div>
      )}

      {/* Request Vault — Creator Response */}
      {activeSection === "requests" && (
        <div className="px-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">The Request Vault</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Custom Media Requests from fans — set your Bit-Token price or decline with a reason.</p>
            <div className="space-y-3">
              {CUSTOM_REQUESTS.map((req) => {
                const action = requestActions[req.id];
                const displayStatus = action?.action ?? req.status;
                return (
                  <div key={req.id} className="border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{req.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">From: @{req.fan}</p>
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
                      {displayStatus === "pending" && respondingTo !== req.id && (
                        <div className="flex gap-2">
                          <Button variant="neon" size="sm" onClick={() => setRespondingTo(req.id)}>
                            RESPOND
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Response form */}
                    {respondingTo === req.id && (
                      <div className="mt-3 bg-secondary/50 border border-border rounded-xl p-3 space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground tracking-wider">SET YOUR BIT-TOKEN PRICE</label>
                          <input
                            type="number"
                            value={responseTokenPrice}
                            onChange={(e) => setResponseTokenPrice(e.target.value)}
                            placeholder="e.g. 25"
                            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="neon"
                            size="sm"
                            className="flex-1"
                            disabled={!responseTokenPrice}
                            onClick={() => handleRequestAction(req.id, "accepted", Number(responseTokenPrice))}
                          >
                            ACCEPT — {responseTokenPrice || "?"} BT
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-destructive border-destructive/30"
                            onClick={() => {
                              const reason = prompt("Reason for declining (optional):") || "Not available";
                              handleRequestAction(req.id, "declined", undefined, reason);
                            }}
                          >
                            DECLINE
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Show token price if accepted */}
                    {action?.action === "accepted" && action.tokenPrice && (
                      <div className="mt-2 bg-primary/10 border border-primary/20 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">Your price: <span className="text-primary font-bold">{action.tokenPrice} BT</span></p>
                      </div>
                    )}

                    {/* Show decline reason */}
                    {action?.action === "declined" && action.reason && (
                      <div className="mt-2 bg-destructive/5 border border-destructive/20 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground">Reason: <span className="text-destructive">{action.reason}</span></p>
                      </div>
                    )}
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
          {/* Upload status */}
          {(uploading || uploadMsg) && (
            <div className={`rounded-xl p-3 text-center text-xs font-bold tracking-wider ${
              uploading ? "bg-primary/10 border border-primary/30 text-primary" : uploadMsg.startsWith("Upload failed") ? "bg-destructive/10 border border-destructive/30 text-destructive" : "bg-green-400/10 border border-green-400/30 text-green-400"
            }`}>
              {uploading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Uploading to {uploading}...</span> : uploadMsg}
            </div>
          )}

          {/* Profile Trailer Upload (15s with audio) */}
          <div className="bg-card border border-primary/30 rounded-xl p-4">
            <h3 className="text-sm font-bold text-foreground mb-2">15s TEASER TRAILER (WITH AUDIO)</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Upload your 15-second MP4 with audio baked in. This loops on the Discovery Feed.
              <span className="text-primary font-bold"> New uploads auto-replace</span> the previous teaser (old one moves to your library).
            </p>
            <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary/50 transition-colors">
              <Upload className="w-6 h-6 text-primary" />
              <Button variant="neon" size="sm" onClick={() => teaserInputRef.current?.click()} disabled={!!uploading}>
                {uploading === "teasers" ? "UPLOADING..." : "UPLOAD 15s TEASER WITH AUDIO"}
              </Button>
              <p className="text-[10px] text-muted-foreground">MP4/WebM with audio • Max 15 seconds • Cloud stored</p>
            </div>
          </div>

          {/* Public Teasers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <h3 className="text-base font-semibold text-foreground">Public Teasers</h3>
              </div>
              <Button variant="neon" size="sm" className="gap-1.5" onClick={() => triggerMediaUpload("teasers")} disabled={!!uploading}>
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

          {/* Creators Uploaded Videos (Vault — Men & Women sides) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-gold" />
                <h3 className="text-base font-semibold text-foreground">Creators Uploaded Videos</h3>
              </div>
              <Button variant="gold" size="sm" className="gap-1.5" onClick={() => triggerMediaUpload("vault")} disabled={!!uploading}>
                <Upload className="w-3.5 h-3.5" />
                Upload to Vault
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Private vault content — visible only to paying customers (Men's & Women's sides).</p>
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
        </div>
      )}

      {/* Support footer */}
      <div className="px-4 mt-8 pb-2 text-center">
        <a href="mailto:dropthatthingmedia@gmail.com" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
          <Mail className="w-3 h-3" />
          Official Support: dropthatthingmedia@gmail.com
        </a>
      </div>
      <LegalFooter />
    </div>
  );
};

export default CreatorAnalyticsDashboard;
