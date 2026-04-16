import { useState, useEffect } from "react";
import { Bell, RefreshCw, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import WalletIndicator from "@/components/WalletIndicator";
import BuyTokensModal from "@/components/BuyTokensModal";
import LegalFooter from "@/components/LegalFooter";
import {
  isUnlockActive, getUnlockTimeRemaining, formatUnlockCountdown,
  UNLOCK_DURATION_MS, TOKEN_INVOICE_USD,
  type CreatorUnlock, type CustomRequest,
} from "@/lib/tokenEconomy";
import type { VaultType } from "@/lib/tokenEconomy";

const RENEWAL_WARNING_MS = 24 * 60 * 60 * 1000;

const MOCK_UNLOCKS: CreatorUnlock[] = [
  { creatorId: "1", creatorName: "LunaCosplay", unlockedAt: Date.now() - 2 * 24 * 60 * 60 * 1000, expiresAt: Date.now() + 12 * 24 * 60 * 60 * 1000 },
  { creatorId: "2", creatorName: "FitJessie", unlockedAt: Date.now() - 10 * 24 * 60 * 60 * 1000, expiresAt: Date.now() + 4 * 24 * 60 * 60 * 1000 },
  { creatorId: "3", creatorName: "BlondieVibes", unlockedAt: Date.now() - 15 * 24 * 60 * 60 * 1000, expiresAt: Date.now() - 1 * 24 * 60 * 60 * 1000 },
  { creatorId: "4", creatorName: "AlphaKing", unlockedAt: Date.now() - 3 * 24 * 60 * 60 * 1000, expiresAt: Date.now() + 11 * 24 * 60 * 60 * 1000 },
  { creatorId: "5", creatorName: "MaxFitness", unlockedAt: Date.now() - 13 * 24 * 60 * 60 * 1000, expiresAt: Date.now() + 18 * 60 * 60 * 1000 },
];

const MY_REQUESTS: CustomRequest[] = [
  { id: "r1", creatorName: "LunaCosplay", description: "Custom cosplay photoshoot", amountUsd: 500, totalTokens: 26, status: "accepted", createdAt: Date.now() - 86400000 },
  { id: "r2", creatorName: "FitJessie", description: "Exclusive workout video", amountUsd: 250, totalTokens: 13.5, status: "pending", createdAt: Date.now() - 43200000 },
  { id: "r3", creatorName: "BlondieVibes", description: "Behind the scenes content", amountUsd: 100, totalTokens: 6, status: "declined", createdAt: Date.now() - 172800000 },
];

const CREATOR_GENDER: Record<string, "women" | "men"> = {
  "LunaCosplay": "women",
  "FitJessie": "women",
  "BlondieVibes": "women",
  "AlphaKing": "men",
  "MaxFitness": "men",
};

interface MemberDashboardProps {
  balance: number;
  onBuyTokens: (n: number) => void;
  vault?: VaultType;
  onNavigateHome?: () => void;
  onCreatorClick?: (name: string) => void;
}

const MemberDashboard = ({ balance, onBuyTokens, vault, onNavigateHome, onCreatorClick }: MemberDashboardProps) => {
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [renewCreator, setRenewCreator] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"library" | "requests">("library");
  const [, setTick] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const activeUnlocks = MOCK_UNLOCKS.filter(u => isUnlockActive(u));
  const myGirls = activeUnlocks.filter(u => CREATOR_GENDER[u.creatorName] === "women");
  const myGuys = activeUnlocks.filter(u => CREATOR_GENDER[u.creatorName] === "men");

  const hasUnlocks = activeUnlocks.length > 0;

  // Dynamic header based on vault preference
  const libraryTitle = vault === "men" ? "MY GUYS" : vault === "women" ? "MY GIRLS" : "MY LIBRARY";

  const expiringCreators = activeUnlocks.filter(u => {
    const remaining = getUnlockTimeRemaining(u);
    return remaining > 0 && remaining <= RENEWAL_WARNING_MS;
  });

  useEffect(() => {
    if (expiringCreators.length > 0 && !notification) {
      const names = expiringCreators.map(c => c.creatorName).join(", ");
      setNotification(`⏰ Access to ${names} expires in less than 24 hours! Renew now to keep watching.`);
    }
  }, [expiringCreators.length]);

  const tabs = [
    { id: "library" as const, label: libraryTitle },
    { id: "requests" as const, label: "MY REQUESTS" },
  ];

  const handleRenew = (creatorName: string) => {
    setRenewCreator(creatorName);
    setShowBuyModal(true);
  };

  const handleCreatorClick = (creatorName: string) => {
    if (onCreatorClick) onCreatorClick(creatorName);
  };

  const renderCreatorCircle = (unlock: CreatorUnlock) => {
    const remaining = getUnlockTimeRemaining(unlock);
    const isExpiringSoon = remaining > 0 && remaining <= RENEWAL_WARNING_MS;

    return (
      <div key={unlock.creatorId} className="flex flex-col items-center gap-1.5 min-w-[80px]">
        <button
          onClick={() => handleCreatorClick(unlock.creatorName)}
          className={`w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent border-2 flex items-center justify-center text-sm font-bold text-primary-foreground shadow-lg transition-transform hover:scale-105 ${
            isExpiringSoon ? "border-gold animate-pulse" : "border-primary/50"
          }`}
        >
          {unlock.creatorName.slice(0, 2).toUpperCase()}
        </button>
        <p className="text-[10px] font-semibold text-foreground truncate max-w-[80px] text-center">@{unlock.creatorName}</p>
        <p className={`text-[9px] ${isExpiringSoon ? "text-gold font-bold" : "text-primary"}`}>
          {formatUnlockCountdown(remaining)}
        </p>
        {isExpiringSoon && (
          <button
            onClick={() => handleRenew(unlock.creatorName)}
            className="flex items-center gap-1 bg-gold/20 hover:bg-gold/30 text-gold text-[9px] font-bold rounded-full px-2 py-0.5 transition-colors"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            RENEW
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20 flex flex-col">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground tracking-wider font-display">{libraryTitle}</h1>
        <WalletIndicator balance={balance} />
      </div>

      {/* Expiration notification */}
      {notification && (
        <div className="mx-4 mb-4 bg-gold/10 border border-gold/30 rounded-xl p-3 relative">
          <button onClick={() => setNotification(null)} className="absolute top-2 right-2 text-muted-foreground text-xs">✕</button>
          <div className="flex items-start gap-2">
            <Bell className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
            <p className="text-xs text-foreground pr-4">{notification}</p>
          </div>
        </div>
      )}

      {/* Balance Card */}
      <div className="mx-4 mb-4 bg-card border border-border rounded-xl p-5 text-center">
        <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
        <div className="flex items-center justify-center gap-2">
          <span className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-sm font-bold text-gold-foreground">B</span>
          <span className="text-3xl font-bold text-foreground">{balance}</span>
          <span className="text-sm text-muted-foreground">Bit-Tokens</span>
        </div>
        <Button variant="neon" className="mt-4 w-full" onClick={() => setShowBuyModal(true)}>
          BUY TOKENS
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest transition-all ${
              activeTab === t.id
                ? "bg-primary text-primary-foreground neon-glow-sm"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Library View */}
      {activeTab === "library" && (
        <div className="px-4 space-y-6 flex-1">
          {!hasUnlocks ? (
            /* Empty state for new customers */
            <div className="flex flex-col items-center justify-center gap-5 py-12">
              <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Compass className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground text-center">No creators unlocked yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Browse the feed to find creators you love, then unlock their vault with Bit-Tokens.
              </p>
              <Button variant="neon" size="lg" className="gap-2" onClick={onNavigateHome}>
                <Compass className="w-5 h-5" />
                DISCOVER CREATORS
              </Button>
            </div>
          ) : (
            <>
              {/* My Girls */}
              {(vault !== "men") && (
                <div>
                  <h3 className="text-xs font-bold tracking-widest text-muted-foreground mb-3">MY GIRLS</h3>
                  {myGirls.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                      {myGirls.map(renderCreatorCircle)}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic">No unlocked creators yet</p>
                  )}
                </div>
              )}

              {/* My Guys */}
              {(vault !== "women") && (
                <div>
                  <h3 className="text-xs font-bold tracking-widest text-muted-foreground mb-3">MY GUYS</h3>
                  {myGuys.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                      {myGuys.map(renderCreatorCircle)}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic">No unlocked creators yet</p>
                  )}
                </div>
              )}

              {/* Show both if "both" preference */}
              {vault === undefined && (
                <>
                  <div>
                    <h3 className="text-xs font-bold tracking-widest text-muted-foreground mb-3">MY GIRLS</h3>
                    {myGirls.length > 0 ? (
                      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                        {myGirls.map(renderCreatorCircle)}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">No unlocked creators yet</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold tracking-widest text-muted-foreground mb-3">MY GUYS</h3>
                    {myGuys.length > 0 ? (
                      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                        {myGuys.map(renderCreatorCircle)}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">No unlocked creators yet</p>
                    )}
                  </div>
                </>
              )}

              <div className="bg-secondary/50 border border-border rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground text-center">
                  Each unlock grants <span className="text-primary font-bold">14 days (336 hours)</span> of access.
                  Expired creators are automatically removed. Tap a profile to open their Private Vault.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* My Requests */}
      {activeTab === "requests" && (
        <div className="px-4 space-y-3 flex-1">
          <p className="text-xs text-muted-foreground mb-2">Only you can see your requests.</p>
          {MY_REQUESTS.map((req) => (
            <div key={req.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">@{req.creatorName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>
                </div>
                <span className="text-sm font-bold text-primary">${req.amountUsd}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  req.status === "pending" ? "bg-gold/10 text-gold border border-gold/30" :
                  req.status === "accepted" ? "bg-primary/10 text-primary border border-primary/30" :
                  req.status === "declined" ? "bg-destructive/10 text-destructive border border-destructive/30" :
                  "bg-green-400/10 text-green-400 border border-green-400/30"
                }`}>
                  {req.status === "pending" ? "Pending" : req.status === "accepted" ? "Accepted" : req.status === "declined" ? "Declined" : "Completed"}
                </span>
                {req.status === "declined" && (
                  <span className="text-[10px] text-muted-foreground italic">Creator passed on this request</span>
                )}
              </div>
              {req.status === "accepted" && balance < req.totalTokens && (
                <div className="mt-3 bg-gold/10 border border-gold/30 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-2">
                    You need <span className="text-primary font-bold">{Math.ceil(req.totalTokens - balance)} more tokens</span> to fulfill this request.
                  </p>
                  <Button variant="neon" size="sm" className="w-full text-xs" onClick={() => setShowBuyModal(true)}>
                    BUY {Math.ceil(req.totalTokens - balance)} BIT-TOKENS — ${Math.ceil(req.totalTokens - balance) * TOKEN_INVOICE_USD}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <LegalFooter />

      {showBuyModal && (
        <BuyTokensModal onClose={() => { setShowBuyModal(false); setRenewCreator(null); }} onPurchase={onBuyTokens} />
      )}
    </div>
  );
};

export default MemberDashboard;
