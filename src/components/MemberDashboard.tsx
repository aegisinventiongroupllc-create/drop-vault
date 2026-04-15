import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import WalletIndicator from "@/components/WalletIndicator";
import BuyTokensModal from "@/components/BuyTokensModal";
import LegalFooter from "@/components/LegalFooter";
import {
  isUnlockActive, getUnlockTimeRemaining, formatUnlockCountdown,
  type CreatorUnlock, type CustomRequest,
} from "@/lib/tokenEconomy";

const MOCK_UNLOCKS: CreatorUnlock[] = [
  { creatorId: "1", creatorName: "LunaCosplay", unlockedAt: Date.now() - 2 * 24 * 60 * 60 * 1000, expiresAt: Date.now() + 12 * 24 * 60 * 60 * 1000 },
  { creatorId: "2", creatorName: "FitJessie", unlockedAt: Date.now() - 10 * 24 * 60 * 60 * 1000, expiresAt: Date.now() + 4 * 24 * 60 * 60 * 1000 },
  { creatorId: "3", creatorName: "BlondieVibes", unlockedAt: Date.now() - 15 * 24 * 60 * 60 * 1000, expiresAt: Date.now() - 1 * 24 * 60 * 60 * 1000 },
  { creatorId: "4", creatorName: "AlphaKing", unlockedAt: Date.now() - 3 * 24 * 60 * 60 * 1000, expiresAt: Date.now() + 11 * 24 * 60 * 60 * 1000 },
  { creatorId: "5", creatorName: "MaxFitness", unlockedAt: Date.now() - 5 * 24 * 60 * 60 * 1000, expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 },
];

const MOCK_REQUESTS: CustomRequest[] = [
  { id: "r1", creatorName: "LunaCosplay", description: "Custom cosplay photoshoot", amountUsd: 500, totalTokens: 26, status: "accepted", createdAt: Date.now() - 86400000 },
  { id: "r2", creatorName: "FitJessie", description: "Exclusive workout video", amountUsd: 250, totalTokens: 13.5, status: "pending", createdAt: Date.now() - 43200000 },
  { id: "r3", creatorName: "BlondieVibes", description: "Behind the scenes content", amountUsd: 100, totalTokens: 6, status: "declined", createdAt: Date.now() - 172800000 },
];

// Mock gender assignment for library sections
const CREATOR_GENDER: Record<string, "women" | "men"> = {
  "LunaCosplay": "women",
  "FitJessie": "women",
  "BlondieVibes": "women",
  "AlphaKing": "men",
  "MaxFitness": "men",
};

const MemberDashboard = ({ balance, onBuyTokens }: { balance: number; onBuyTokens: (n: number) => void }) => {
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"library" | "requests">("library");
  const [, setTick] = useState(0);
  const [notification, setNotification] = useState<string | null>(
    "LunaCosplay has gifted you a Bit-Token for your loyalty! Enjoy 14 days of exclusive access to the Vault."
  );

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const activeUnlocks = MOCK_UNLOCKS.filter(u => isUnlockActive(u));
  const myGirls = activeUnlocks.filter(u => CREATOR_GENDER[u.creatorName] === "women");
  const myGuys = activeUnlocks.filter(u => CREATOR_GENDER[u.creatorName] === "men");

  const tabs = [
    { id: "library" as const, label: "MY LIBRARY" },
    { id: "requests" as const, label: "REQUESTS" },
  ];

  const renderCreatorCircle = (unlock: CreatorUnlock) => {
    const remaining = getUnlockTimeRemaining(unlock);
    return (
      <div key={unlock.creatorId} className="flex flex-col items-center gap-1.5 min-w-[72px]">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-primary/50 flex items-center justify-center text-sm font-bold text-primary-foreground shadow-lg">
          {unlock.creatorName.slice(0, 2).toUpperCase()}
        </div>
        <p className="text-[10px] font-semibold text-foreground truncate max-w-[72px] text-center">@{unlock.creatorName}</p>
        <p className="text-[9px] text-primary">{formatUnlockCountdown(remaining)}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20 flex flex-col">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground tracking-wider font-display">MY LIBRARY</h1>
        <WalletIndicator balance={balance} />
      </div>

      {notification && (
        <div className="mx-4 mb-4 bg-primary/10 border border-primary/30 rounded-xl p-3 relative">
          <button onClick={() => setNotification(null)} className="absolute top-2 right-2 text-muted-foreground text-xs">✕</button>
          <p className="text-xs text-foreground pr-4">{notification}</p>
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
          {/* My Girls */}
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

          {/* My Guys */}
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
        </div>
      )}

      {/* Requests */}
      {activeTab === "requests" && (
        <div className="px-4 space-y-3 flex-1">
          {MOCK_REQUESTS.map((req) => (
            <div key={req.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">@{req.creatorName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>
                </div>
                <span className="text-sm font-bold text-primary">${req.amountUsd}</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                req.status === "pending" ? "bg-gold/10 text-gold border border-gold/30" :
                req.status === "accepted" ? "bg-primary/10 text-primary border border-primary/30" :
                req.status === "declined" ? "bg-destructive/10 text-destructive border border-destructive/30" :
                "bg-green-400/10 text-green-400 border border-green-400/30"
              }`}>
                {req.status === "pending" ? "Pending" : req.status === "accepted" ? "Accepted" : req.status === "declined" ? "Declined" : "Completed"}
              </span>
            </div>
          ))}
        </div>
      )}

      <LegalFooter />

      {showBuyModal && (
        <BuyTokensModal onClose={() => setShowBuyModal(false)} onPurchase={onBuyTokens} />
      )}
    </div>
  );
};

export default MemberDashboard;
