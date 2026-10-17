import DttToken from "@/components/DttToken";
import RequestDelivery from "@/components/RequestDelivery";
import PrivateMessages from "@/components/PrivateMessages";
import { allowedVaults, type CustomerPreference } from "@/lib/customerPreference";
import SuggestionBox from "@/components/SuggestionBox";
import { useState, useEffect, useCallback } from "react";
import { Bell, RefreshCw, Compass, Heart, Vault } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import WalletIndicator from "@/components/WalletIndicator";
import BuyTokensModal from "@/components/BuyTokensModal";
import TokenPurchaseHistory from "@/components/TokenPurchaseHistory";
import {
  isUnlockActive, getUnlockTimeRemaining, formatUnlockCountdown,
  UNLOCK_DURATION_MS, TOKEN_INVOICE_USD,
  SUPPORT_TIP_TOKENS, SUPPORT_TIP_USD, calculateSupportTipSplit,
  type CreatorUnlock,
} from "@/lib/tokenEconomy";
import type { VaultType } from "@/lib/tokenEconomy";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useMyHearts } from "@/hooks/useHearts";
import LegalFooter from "@/components/LegalFooter";
import ProfileAvatar from "@/components/ProfileAvatar";
import { useCustomRequests, acceptCounterOffer, declineCounter, type CustomRequestRow } from "@/hooks/useCustomRequests";
import { Loader2, DollarSign, Clock } from "lucide-react";

const RENEWAL_WARNING_MS = 24 * 60 * 60 * 1000;
const AUTORENEW_KEY = "dtt_autorenew";

function loadAutorenew(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(AUTORENEW_KEY) || "{}"); } catch { return {}; }
}
function saveAutorenew(map: Record<string, boolean>) {
  localStorage.setItem(AUTORENEW_KEY, JSON.stringify(map));
}


interface MemberDashboardProps {
  balance: number;
  onBuyTokens: (n: number) => void;
  vault?: VaultType;
  preference?: CustomerPreference;
  onNavigateHome?: () => void;
  onCreatorClick?: (name: string) => void;
}

const MemberDashboard = ({ balance, onBuyTokens, vault, preference, onNavigateHome, onCreatorClick }: MemberDashboardProps) => {
  const visibleVaults = allowedVaults(preference ?? vault);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [renewCreator, setRenewCreator] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"library" | "requests" | "messages">("library");
  const [, setTick] = useState(0);
  useEffect(() => {
    if (sessionStorage.getItem("dtt_open_buy") === "1") {
      sessionStorage.removeItem("dtt_open_buy");
      setShowBuyModal(true);
    }
  }, []);
  const [notification, setNotification] = useState<string | null>(null);

  const [autorenew, setAutorenew] = useState<Record<string, boolean>>(() => loadAutorenew());
  const { toast } = useToast();
  const { requests: myRequests, loading: reqLoading, refresh: refreshReqs } = useCustomRequests("customer");
  const [reqBusy, setReqBusy] = useState(false);
  const { subs } = useSubscriptions();
  const [genderMap, setGenderMap] = useState<Record<string, "women" | "men">>({});
  const { hearts } = useMyHearts();
  const [savedNames, setSavedNames] = useState<Record<string, string>>({});
  const [savedAvatars, setSavedAvatars] = useState<Record<string, unknown>>({});
  const [savedPhotoPaths, setSavedPhotoPaths] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const ids = Array.from(new Set([...subs.map((s) => s.creator_id), ...hearts.map((h) => h.creator_id)]));
    if (ids.length === 0) { setGenderMap({}); return; }
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("public_profiles")
        .select("user_id, vault_side, display_name, avatar_config, profile_photo_path")
        .in("user_id", ids);
      if (cancel || !data) return;
      const map: Record<string, "women" | "men"> = {};
      data.forEach((p: any) => { map[p.user_id] = (p.vault_side === "men" ? "men" : "women"); });
      setGenderMap(map);
      const names: Record<string, string> = {};
      data.forEach((p: any) => { names[p.user_id] = p.display_name || "creator"; });
      setSavedNames(names);
      const avatars: Record<string, unknown> = {};
      data.forEach((p: any) => { avatars[p.user_id] = p.avatar_config; });
      setSavedAvatars(avatars);
      const photoPaths: Record<string, string | null> = {};
      data.forEach((p) => { photoPaths[p.user_id] = p.profile_photo_path; });
      setSavedPhotoPaths(photoPaths);
    })();
    return () => { cancel = true; };
  }, [subs, hearts]);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleAutorenew = async (creatorId: string, creatorName: string) => {
    const nextValue = !autorenew[creatorId];
    const next = { ...autorenew, [creatorId]: nextValue };
    setAutorenew(next);
    saveAutorenew(next);

    // Persist to backend so the hourly renewal cron honors it.
    // Falls back silently if the user has no real subscription row yet (mock data).
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: u } = await supabase.auth.getUser();
      if (u.user?.id) {
        await supabase
          .from("subscriptions")
          .update({ autorenew: nextValue })
          .eq("customer_id", u.user.id)
          .eq("creator_id", creatorId);
      }
    } catch { /* ignore — local toggle still applies */ }

    toast({
      title: nextValue ? "Autopay ON" : "Autopay OFF",
      description: nextValue
        ? `@${creatorName} will auto-renew every 14 days using 1 Bit-Token. We'll warn you 24h before renewal.`
        : `@${creatorName} will no longer auto-renew.`,
    });
  };

  const handleSupport = (creatorName: string) => {
    if (balance < SUPPORT_TIP_TOKENS) {
      toast({
        title: "Not enough Bit-Tokens",
        description: `Support sends 1 Bit-Token ($${SUPPORT_TIP_USD}) to @${creatorName}. Buy more to continue.`,
        variant: "destructive",
      });
      setShowBuyModal(true);
      return;
    }
    const split = calculateSupportTipSplit();
    onBuyTokens(-SUPPORT_TIP_TOKENS); // deduct 1 token from balance
    toast({
      title: `💖 Support sent to @${creatorName}`,
      description: `1 Bit-Token ($${split.totalUsd}) — Creator gets $${split.creatorShare}, Platform $${split.platformShare}.`,
    });
  };

  const activeUnlocks: CreatorUnlock[] = subs
    .filter((s) => s.status === "active" && new Date(s.expires_at) > new Date())
    .map((s) => ({
      creatorId: s.creator_id,
      creatorName: s.creator_name || "creator",
      unlockedAt: new Date(s.started_at).getTime(),
      expiresAt: new Date(s.expires_at).getTime(),
    }));
  const myGirls = activeUnlocks.filter(u => (genderMap[u.creatorId] ?? "women") === "women");
  const myGuys  = activeUnlocks.filter(u => (genderMap[u.creatorId] ?? "women") === "men");

  const unlockedIds = new Set(activeUnlocks.map((u) => u.creatorId));
  const savedLocked = hearts
    .filter((h) => !unlockedIds.has(h.creator_id))
    .map((h) => ({ id: h.creator_id, name: savedNames[h.creator_id] || "creator", side: genderMap[h.creator_id] ?? "women" }))
    .filter((c) => visibleVaults.includes(c.side));
  const hasUnlocks = activeUnlocks.length > 0 || savedLocked.length > 0;

  // Dynamic header based on vault preference
  const libraryTitle = visibleVaults.length === 2 ? "MY LIBRARY" : visibleVaults[0] === "men" ? "MY GUYS" : "MY GIRLS";

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
    { id: "messages" as const, label: "MESSAGES" },
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
    const isAutoOn = !!autorenew[unlock.creatorId];

    return (
      <div key={unlock.creatorId} className="flex flex-col items-center gap-1.5 min-w-[96px]">
        <button
          onClick={() => handleCreatorClick(unlock.creatorName)}
          className={`w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent border-2 flex items-center justify-center text-sm font-bold text-primary-foreground shadow-lg transition-transform hover:scale-105 ${
            isExpiringSoon ? "border-gold animate-pulse" : "border-primary/50"
          }`}
        >
          <ProfileAvatar config={savedAvatars[unlock.creatorId]} creatorPhotoPath={savedPhotoPaths[unlock.creatorId]} label={unlock.creatorName} className="h-full w-full border-0" />
        </button>
        <p className="text-[10px] font-semibold text-foreground truncate max-w-[96px] text-center">@{unlock.creatorName}</p>
        <p className={`text-[9px] ${isExpiringSoon ? "text-gold font-bold" : "text-primary"}`}>
          {formatUnlockCountdown(remaining)}
        </p>

        {/* Autopay toggle */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[8px] font-bold tracking-wider ${isAutoOn ? "text-primary" : "text-muted-foreground"}`}>AUTOPAY</span>
          <Switch
            checked={isAutoOn}
            onCheckedChange={() => toggleAutorenew(unlock.creatorId, unlock.creatorName)}
            className="scale-50 -my-2"
          />
        </div>

        {/* Support button */}
        <button
          onClick={() => handleSupport(unlock.creatorName)}
          className="flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary text-[9px] font-bold rounded-full px-2 py-0.5 transition-colors"
          title={`Send 1 Bit-Token ($${SUPPORT_TIP_USD}) — Creator gets $19, Platform $1`}
        >
          <Heart className="w-2.5 h-2.5" />
          SUPPORT 1BT
        </button>

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
    <div className="mobile-scroll-shell flex flex-col">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground tracking-wider font-display">{libraryTitle}</h1>
        <WalletIndicator />
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

      {/* Fill Your Vault */}
      <div className="mx-4 mb-4 bg-card border border-primary/40 rounded-xl p-5 text-center neon-glow-sm">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Vault className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold uppercase tracking-wider text-foreground">Fill Your Vault</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-1">Coins in your vault</p>
        <div className="flex items-center justify-center gap-2">
          <DttToken />
          <span className="text-3xl font-bold text-foreground">{balance}</span>
          <span className="text-sm text-muted-foreground">Bit-Tokens</span>
        </div>
        <Button variant="neon" className="mt-4 w-full" onClick={() => setShowBuyModal(true)}>
          FILL YOUR VAULT
        </Button>
        <a href="/pricing" className="mt-3 inline-block text-xs font-semibold uppercase tracking-wider text-primary underline">See pricing</a>
      </div>

      {/* Top-up history */}
      <TokenPurchaseHistory />

      {/* Tabs */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto">
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
              {savedLocked.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold tracking-widest text-muted-foreground mb-3">MY WISHLIST — TAP TO UNLOCK</h3>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {savedLocked.map((c) => (
                      <button key={c.id} onClick={() => onCreatorClick?.(c.name)} className="flex flex-col items-center gap-1 flex-shrink-0 w-20">
                        <ProfileAvatar config={savedAvatars[c.id]} creatorPhotoPath={savedPhotoPaths[c.id]} label={c.name} className="h-16 w-16" />
                        <span className="text-[10px] text-foreground truncate w-full text-center">@{c.name}</span>
                        <span className="text-[9px] font-bold text-primary">UNLOCK 14D</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* My Girls */}
              {visibleVaults.includes("women") && (
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
              {visibleVaults.includes("men") && (
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

      {/* My Requests — real data */}
      {activeTab === "messages" && <div className="px-4 flex-1"><PrivateMessages /></div>}
      {activeTab === "requests" && (
        <div className="px-4 space-y-3 flex-1">
          <p className="text-xs text-muted-foreground mb-2">Only you can see your requests.</p>
          {reqLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : myRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No requests yet. Send one from a creator's page.</p>
          ) : (
            myRequests.map((req) => {
              const expired = req.expires_at && new Date(req.expires_at) < new Date();
              const expiresIn = req.expires_at ? (() => {
                const ms = new Date(req.expires_at).getTime() - Date.now();
                if (ms <= 0) return "Expired";
                const d = Math.floor(ms / 86400000);
                const h = Math.floor((ms % 86400000) / 3600000);
                return d > 0 ? `${d}d ${h}h` : `${h}h`;
              })() : null;

              return (
                <div key={req.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">@{req.creator_name || "Creator"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>
                    </div>
                    <span className="text-sm font-bold text-primary">${req.amount_usd}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      req.status === "pending" ? "bg-gold/10 text-gold border-gold/30" :
                      req.status === "accepted" ? "bg-primary/10 text-primary border-primary/30" :
                      req.status === "countered" ? "bg-amber-400/10 text-amber-400 border-amber-400/30" :
                      req.status === "paid" ? "bg-blue-400/10 text-blue-400 border-blue-400/30" :
                      req.status === "completed" ? "bg-green-400/10 text-green-400 border-green-400/30" :
                      "bg-destructive/10 text-destructive border-destructive/30"
                    }`}>
                      {req.status === "pending" ? "Pending" :
                       req.status === "accepted" ? "Accepted — Pay Now" :
                       req.status === "countered" ? "Counter-Offer" :
                       req.status === "paid" ? "Paid — In Progress" :
                       req.status === "completed" ? "Completed" : "Declined"}
                    </span>
                    {!expired && expiresIn && req.status === "pending" && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{expiresIn}</span>
                    )}
                  </div>

                  {/* Counter-offer from creator */}
                  {req.status === "countered" && req.counter_offer_usd && (
                    <div className="mt-3 bg-amber-400/10 border border-amber-400/30 rounded-lg p-3 space-y-2">
                      <p className="text-xs text-foreground">Creator's counter: <span className="text-amber-400 font-bold">${req.counter_offer_usd}</span></p>
                      {req.counter_message && <p className="text-[10px] text-muted-foreground italic">"{req.counter_message}"</p>}
                      <div className="flex gap-2">
                        <Button variant="neon" size="sm" className="flex-1" disabled={reqBusy} onClick={async () => {
                          setReqBusy(true);
                          if (req.counter_offer_usd === null) { setReqBusy(false); return; }
                          const { error } = await acceptCounterOffer(req.id, req.counter_offer_usd);
                          setReqBusy(false);
                          if (error) { toast({ title: "Couldn't accept the counter", description: error.message, variant: "destructive" }); return; }
                          refreshReqs();
                          toast({ title: "Counter accepted", description: "You can now pay for the request." });
                        }}>
                          ACCEPT ${req.counter_offer_usd}
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/30" disabled={reqBusy} onClick={async () => {
                          setReqBusy(true);
                          await declineCounter(req.id);
                          setReqBusy(false);
                          refreshReqs();
                        }}>
                          DECLINE
                        </Button>
                      </div>
                    </div>
                  )}

                  <RequestDelivery request={req} role="customer" onChange={refreshReqs} />
                  {req.status === "accepted" && <p className="text-xs text-muted-foreground mt-2">Request payment checkout is not available yet.</p>}
                  {req.status === "declined" && (
                    <span className="text-[10px] text-muted-foreground italic mt-2 block">Creator passed on this request</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      <div className="px-4 py-4"><SuggestionBox role="customer" /></div>

      <LegalFooter />

      {showBuyModal && (
        <BuyTokensModal onClose={() => { setShowBuyModal(false); setRenewCreator(null); }} onPurchase={onBuyTokens} />
      )}
    </div>
  );
};

export default MemberDashboard;
