import { useState, useEffect } from "react";
import dttCoin from "@/assets/dtt-reward-coin.png";
import { ArrowLeft, BadgeCheck, Crown, Lock, Sparkles, Palette, Heart, DollarSign, Play, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import WalletIndicator from "@/components/WalletIndicator";
import CreatorMediaGrid from "@/components/CreatorMediaGrid";
import CustomRequestModal from "@/components/CustomRequestModal";
import { supabase } from "@/integrations/supabase/client";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { toast } from "@/hooks/use-toast";
import BuyTokensModal from "@/components/BuyTokensModal";
import { formatUnlockCountdown } from "@/lib/tokenEconomy";
import LegalFooter from "@/components/LegalFooter";
import CreatorTeaserAvatar from "@/components/CreatorTeaserAvatar";
import TopFansSection from "@/components/TopFansSection";
import CreatorHeartButton from "@/components/CreatorHeartButton";
import DttToken from "@/components/DttToken";
import { useHeartTotal } from "@/hooks/useHearts";

interface Vault {
  name: string;
  videoCount: number;
  price: number;
  emoji: string;
}

const CreatorProfile = ({ creatorName, onBack }: { creatorName: string; onBack: () => void }) => {
  const [showRequest, setShowRequest] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState<unknown>(null);
  const [profilePhotoPath, setProfilePhotoPath] = useState<string | null>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [tipSent, setTipSent] = useState(false);
  const [tipNotification, setTipNotification] = useState<string | null>(null);

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [vaultCount, setVaultCount] = useState<number>(0);
  const [vaultItems, setVaultItems] = useState<{ id: string; title: string; url: string | null; media_type: string }[]>([]);
  const [vaultOffset,setVaultOffset]=useState(0);
  const [moreVault,setMoreVault]=useState(false);
  const [vaultError,setVaultError]=useState("");
  const [vaultLoading,setVaultLoading]=useState(false);
  useEffect(()=>{setVaultItems([]);setVaultOffset(0);},[creatorId]);
  const [unlocking, setUnlocking] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const { balance, refresh: refreshBalance } = useTokenBalance();
  const { subs, refresh: refreshSubs } = useSubscriptions();

  // Resolve creator by display_name
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("public_profiles")
        .select("user_id, avatar_config, profile_photo_path")
        .ilike("display_name", creatorName)
        .limit(1)
        .maybeSingle();
      if (!cancel) {
        setCreatorId(data?.user_id ?? null);
        setAvatarConfig(data?.avatar_config ?? null);
        setProfilePhotoPath(data?.profile_photo_path ?? null);
      }
    })();
    return () => { cancel = true; };
  }, [creatorName]);
  const [coinDrop, setCoinDrop] = useState(false);

  // Public vault count (so locked users still see how many videos are inside)
  useEffect(() => {
    if (!creatorId) return;
    let cancel = false;
    (async () => {
      const { count } = await supabase
        .from("creator_media")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", creatorId)
        .eq("bucket", "vault");
      if (!cancel) setVaultCount(count ?? 0);
    })();
    return () => { cancel = true; };
  }, [creatorId]);

  const heartCount = useHeartTotal(creatorId);

  const activeSub = creatorId
    ? subs.find((s) => s.creator_id === creatorId && s.status === "active" && new Date(s.expires_at) > new Date())
    : undefined;
  const isUnlocked = !!activeSub;

  // Fetch unlocked vault items via edge function
  useEffect(() => {
    if (!isUnlocked || !creatorId) { setVaultItems([]); return; }
    let cancel = false;
    let timer:ReturnType<typeof setTimeout>|undefined;
    const load=async()=>{
      setVaultLoading(true);
      const {data,error}=await supabase.functions.invoke("vault-media",{body:{creator_id:creatorId,offset:vaultOffset}});
      if(cancel)return;
      setVaultLoading(false);
      if(error || !data?.items){setVaultError("Vault unavailable. Your access may have expired.");setVaultItems([]);return;}
      setVaultError("");setMoreVault(!!data.has_more);
      setVaultItems(previous=>vaultOffset===0?data.items:[...previous.filter(p=>!data.items.some((item:{id:string})=>item.id===p.id)),...data.items]);
      const expiry=data.access_until?Date.parse(data.access_until)-Date.now():Infinity;
      timer=setTimeout(()=>{if(data.access_until && Date.parse(data.access_until)<=Date.now()){setVaultItems([]);setVaultError("Access expired. Renew to keep watching.");}else if(vaultOffset>0){setVaultItems([]);setVaultOffset(0);}else void load();},Math.max(1000,Math.min(50*60000,expiry)));
    };
    void load();
    return () => {cancel=true;clearTimeout(timer);};
  }, [isUnlocked,creatorId,vaultOffset]);

  const handleUnlock = async () => {
    if (!creatorId) {
      toast({ title: "Creator not found", description: "We couldn't find this creator's account.", variant: "destructive" });
      return;
    }
    if (balance < 1) {
      toast({ title: "Need Bit-Tokens", description: "Buy at least 1 Bit-Token to unlock 14 days of access." });
      setShowBuyModal(true);
      return;
    }
    setUnlocking(true);
    const { error } = await supabase.rpc("unlock_creator", { _creator_id: creatorId });
    setUnlocking(false);
    if (error) {
      if (error.message?.includes("INSUFFICIENT_TOKENS")) {
        toast({ title: "Not enough Bit-Tokens", description: "Top up to unlock 14 days of access." });
        setShowBuyModal(true);
      } else {
        toast({ title: "Unlock failed", description: error.message, variant: "destructive" });
      }
      return;
    }
    setCoinDrop(true);
    window.setTimeout(() => setCoinDrop(false), 1800);
    await Promise.all([refreshBalance(), refreshSubs()]);
    toast({ title: `Unlocked @${creatorName} ✓`, description: "14 days of full library access added." });
  };

  const TIP_AMOUNTS = [5, 10, 20, 50, 100];

  const handleSendTip = (amount: number) => {
    const netAmount = Math.round(amount * 0.9 * 100) / 100;
    // In production, this generates an LTC checkout invoice
    setTipSent(true);
    setTipNotification(`Tip of $${amount} sent! Creator receives $${netAmount} (90%).`);
    setTimeout(() => { setShowTipModal(false); setTipSent(false); setSelectedTip(null); setTipNotification(null); }, 3000);
  };

  return (
    <div className="mobile-scroll-shell">
      {coinDrop && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center pointer-events-none bg-background/60 backdrop-blur-sm" aria-hidden="true">
          <img src={dttCoin} alt="" className="w-40 h-40 object-contain animate-[coin-drop_1.6s_ease-out_forwards]" />
        </div>
      )}
      <style>{`@keyframes coin-drop{0%{transform:translateY(-60vh) rotateY(0) scale(.6);opacity:0}40%{opacity:1}70%{transform:translateY(0) rotateY(720deg) scale(1.1)}100%{transform:translateY(0) rotateY(720deg) scale(1);opacity:0}}`}</style>
      {/* Header */}
      <div className="relative">
        <div className="h-40 bg-gradient-to-br from-primary/20 via-card to-card" />
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-background/60 backdrop-blur flex items-center justify-center text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <WalletIndicator />
        </div>

        {/* Public avatar */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <CreatorTeaserAvatar creatorId={creatorId} creatorName={creatorName} avatarConfig={avatarConfig} photoPath={profilePhotoPath} unlocked={isUnlocked} unlocking={unlocking} onUnlock={handleUnlock} isMen={document.documentElement.classList.contains("vault-men")} />
        </div>
      </div>

      {/* Info */}
      <div className="pt-16 px-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-xl font-bold text-foreground">@{creatorName}</h2>
          <BadgeCheck className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground mt-1">Content Creator • {heartCount.toLocaleString()} {heartCount === 1 ? "heart" : "hearts"}</p>
        {creatorId && <CreatorHeartButton creatorId={creatorId} />}

        {/* King of the Vault — empty until first top supporter */}
        <div className="mt-4 mx-auto max-w-xs bg-secondary/50 border border-gold/30 rounded-lg px-4 py-3 gold-glow">
          <div className="flex items-center justify-center gap-2">
            <Crown className="w-5 h-5 text-gold" />
            <span className="text-sm font-semibold text-gold">King of the Vault</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">No top supporter yet</p>
        </div>
      </div>

      {/* Custom Request Button */}
      <div className="px-4 mt-6">
        <Button
          variant="gold"
          size="lg"
          className="w-full text-base font-semibold gap-2"
          onClick={() => setShowRequest(true)}
        >
          <Palette className="w-5 h-5" />
          Request Custom Media
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-1.5">
          Premium commissions from $500 — $10,001 • Direct LTC payment
        </p>
      </div>

      {/* Send a Tip */}
      <div className="px-4 mt-3">
        <Button
          variant="neon"
          size="lg"
          className="w-full text-base font-semibold gap-2"
          onClick={() => setShowTipModal(true)}
        >
          <Heart className="w-5 h-5" />
          SEND A TIP
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-1.5">
          Show your support — no extra fee, creator keeps 90%
        </p>
      </div>

      {/* Tip Modal */}
      {showTipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => { if (!tipSent) { setShowTipModal(false); setSelectedTip(null); } }}>
          <div className="bg-card border border-border rounded-2xl p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground text-center mb-1">
              <Heart className="w-5 h-5 inline text-pink-400 mr-1" /> Send a Tip to {creatorName}
            </h3>
            <p className="text-xs text-muted-foreground text-center mb-4">
              No extra fee. The creator keeps 90% of every tip.
            </p>
            {tipNotification ? (
              <div className="bg-green-400/10 border border-green-400/30 rounded-xl p-4 text-center">
                <p className="text-sm font-bold text-green-400">{tipNotification}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {TIP_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setSelectedTip(amt)}
                      className={`py-3 rounded-xl text-sm font-bold transition-all border ${
                        selectedTip === amt
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-secondary border-border text-foreground hover:border-primary/40"
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                {selectedTip && (
                  <div className="bg-secondary/50 rounded-lg p-3 mb-4 text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between"><span>Tip Amount:</span><span className="text-foreground font-bold">${selectedTip}</span></div>
                    <div className="flex justify-between"><span>Platform share (10%):</span><span className="text-foreground font-bold">${Math.round(selectedTip * 10) / 100}</span></div>
                    <div className="flex justify-between border-t border-border pt-1"><span>Creator Receives:</span><span className="text-primary font-bold">${Math.round(selectedTip * 90) / 100}</span></div>
                  </div>
                )}
                <Button
                  variant="neon"
                  className="w-full"
                  disabled={!selectedTip}
                  onClick={() => selectedTip && handleSendTip(selectedTip)}
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  {selectedTip ? `SEND $${selectedTip} TIP` : "SELECT AN AMOUNT"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Full Library — unlock or watch */}
      <div className="px-4 mt-8">
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          Full Library
          <span className="text-xs text-muted-foreground font-normal">({vaultCount} {vaultCount === 1 ? "video" : "videos"})</span>
        </h3>

        {isUnlocked ? (
          <>
            <div className="bg-primary/10 border border-primary/40 rounded-xl px-4 py-3 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary tracking-wider">UNLOCKED</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {activeSub ? formatUnlockCountdown(new Date(activeSub.expires_at).getTime() - Date.now()) : ""} left
              </span>
            </div>

            {vaultError ? <p role="alert" className="text-sm text-destructive py-4">{vaultError}</p> : vaultCount === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">This creator hasn't added any long-form videos yet.</p>
            ) : vaultItems.length === 0 ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {vaultItems.map((v) => (
                  <div key={v.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    {v.url ? (
                      <video src={v.url} className="w-full aspect-video object-cover bg-background" controls playsInline preload="none" />
                    ) : (
                      <div className="w-full aspect-video bg-secondary flex items-center justify-center"><Lock className="w-4 h-4 text-muted-foreground" /></div>
                    )}
                    <p className="text-xs font-semibold text-foreground p-2 truncate">{v.title}</p>
                  </div>
                ))}
              </div>
            )}

            {moreVault && <Button variant="outline" disabled={vaultLoading} onClick={()=>setVaultOffset(n=>n+24)}>{vaultLoading ? 'Loading…' : 'More videos'}</Button>}
            <Button variant="outline" size="lg" className="w-full mt-3 gap-2" onClick={handleUnlock} disabled={unlocking}>
              {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              EXTEND +14 DAYS — 1 BIT-TOKEN
            </Button>
          </>
        ) : (
          <>
            <div className="bg-card border border-border rounded-xl p-6 text-center mb-3">
              <DttToken className="w-20 h-20 mx-auto mb-2" />
              <p className="text-sm font-bold text-foreground">Drop 1 DTT Bit-Token to unlock</p>
              <p className="text-xs text-muted-foreground mt-1">14 days of full access to every long-form video from @{creatorName}.</p>
            </div>
            <Button variant="neon" size="lg" className="w-full text-base font-semibold gap-2" onClick={handleUnlock} disabled={unlocking || !creatorId}>
              {unlocking ? <Loader2 className="w-5 h-5 animate-spin" /> : <img src={dttCoin} alt="" className="w-6 h-6 object-contain" />}
              DROP 1 BIT-TOKEN — UNLOCK 14 DAYS
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Your balance: <span className="text-foreground font-bold">{balance}</span> Bit-Token{balance === 1 ? "" : "s"} • 1 = 14 days
            </p>
          </>
        )}
      </div>

      {/* Top 10 Fans leaderboard + gated messaging */}
      {creatorId && <TopFansSection creatorId={creatorId} creatorName={creatorName} />}

      <LegalFooter />

      {/* Custom Request Modal */}
      {showRequest && (
        <CustomRequestModal creatorName={creatorName} onClose={() => setShowRequest(false)} />
      )}
      {showBuyModal && (
        <BuyTokensModal
          onClose={() => setShowBuyModal(false)}
          onPurchase={() => { setShowBuyModal(false); refreshBalance(); }}
        />
      )}
    </div>
  );
};

export default CreatorProfile;
