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
import { formatUnlockCountdown, calculateTokenTip } from "@/lib/tokenEconomy";
import { useProfileBackdrop } from "@/hooks/useProfileBackdrop";
import LivingProfileBackdrop from "@/components/LivingProfileBackdrop";
import { parseAvatarConfig } from "@/components/ProfileAvatar";
import { createPortal } from "react-dom";
import LegalFooter from "@/components/LegalFooter";
import CreatorTeaserAvatar from "@/components/CreatorTeaserAvatar";
import TopFansSection from "@/components/TopFansSection";
import CreatorHeartButton from "@/components/CreatorHeartButton";
import DttToken from "@/components/DttToken";
import { useHeartTotal } from "@/hooks/useHearts";
import { hasLibraryContent } from "@/lib/teaserPlayback";

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

  const [isMen, setIsMen] = useState(false);
  const [vipBadge, setVipBadge] = useState(false);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const profileBackdrop = useProfileBackdrop(creatorId);
  const [vaultCount, setVaultCount] = useState<number | null>(null);
  const [countError, setCountError] = useState(false);
  const libraryAvailable = hasLibraryContent(vaultCount);
  const [vaultItems, setVaultItems] = useState<{ id: string; title: string; url: string | null; media_type: string; allow_permanent_buyout?: boolean; owned?: boolean }[]>([]);
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
        .select("user_id, avatar_config, profile_photo_path, vault_side")
        .ilike("display_name", creatorName)
        .limit(1)
        .maybeSingle();
      if (!cancel) {
        setCreatorId(data?.user_id ?? null);
        setAvatarConfig(data?.avatar_config ?? null);
        setProfilePhotoPath(data?.profile_photo_path ?? null);
        setIsMen(data?.vault_side === "men");
      }
    })();
    return () => { cancel = true; };
  }, [creatorName]);
  const [coinDrop, setCoinDrop] = useState(false);

  // Public vault count (so locked users still see how many videos are inside)
  useEffect(() => {
    setVaultCount(null);
    setCountError(false);
    if (!creatorId) return;
    let cancel = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_creator_library_count", { _creator_id: creatorId });
      if (!cancel) { setVaultCount(error ? null : Number(data)); setCountError(!!error); }
    })();
    return () => { cancel = true; };
  }, [creatorId]);

  const heartCount = useHeartTotal(creatorId);
  useEffect(() => {
    let cancelled = false;
    setVipBadge(false);
    if (creatorId) void supabase.rpc("get_creator_vip_status", { _creator_id: creatorId }).then(({ data, error }) => {
      if (!cancelled && !error && data && typeof data === "object" && !Array.isArray(data)) setVipBadge(data.vip_badge === true);
    });
    return () => { cancelled = true; };
  }, [creatorId]);

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

  const handleUnlock = async (year = false) => {
    const need = year ? 26 : 1;
    if (!creatorId) {
      toast({ title: "Creator not found", description: "We couldn't find this creator's account.", variant: "destructive" });
      return;
    }
    if (!libraryAvailable) {
      toast({ title: vaultCount === 0 ? "Library coming soon" : "Library unavailable", description: "No Bit-Token has been used." });
      return;
    }
    if (balance < need) {
      toast({ title: "Need Bit-Tokens", description: year ? "A full year takes 26 Bit-Tokens ($650)." : "Buy at least 1 Bit-Token to unlock 14 days of access." });
      setShowBuyModal(true);
      return;
    }
    setUnlocking(true);
    const { error } = year ? await supabase.rpc("unlock_creator_year", { _creator_id: creatorId }) : await supabase.rpc("unlock_creator", { _creator_id: creatorId });
    setUnlocking(false);
    if (error) {
      if (error.message?.includes("INSUFFICIENT_TOKENS")) {
        toast({ title: "Not enough Bit-Tokens", description: "Top up to unlock 14 days of access." });
        setShowBuyModal(true);
      } else if (error.message?.includes("LIBRARY_EMPTY")) {
        setVaultCount(0);
        toast({ title: "Library coming soon", description: "No Bit-Token has been used." });
      } else {
        toast({ title: "Unlock failed", description: error.message, variant: "destructive" });
      }
      return;
    }
    setCoinDrop(true);
    window.setTimeout(() => setCoinDrop(false), 1800);
    await Promise.all([refreshBalance(), refreshSubs()]);
    toast({ title: `Unlocked @${creatorName} ✓`, description: year ? "A full year (364 days) of library access added." : "14 days of full library access added." });
  };

  const [buyingId, setBuyingId] = useState<string | null>(null);
  const rotatingSoon = !!activeSub && new Date(activeSub.expires_at).getTime() - Date.now() <= 72 * 3600 * 1000;
  const handleBuyout = async (videoId: string) => {
    if (balance < 1) { toast({ title: "Need 1 Bit-Token", description: "Buy a Bit-Token ($25 checkout) to save this video permanently." }); setShowBuyModal(true); return; }
    setBuyingId(videoId);
    const { error } = await supabase.rpc("buy_permanent_video", { _video_id: videoId });
    setBuyingId(null);
    if (error) {
      if (error.message?.includes("INSUFFICIENT_TOKENS")) { setShowBuyModal(true); return; }
      const msg = error.message?.includes("ALREADY_OWNED") ? "This video is already in your permanent vault." : error.message?.includes("BUYOUT_UNAVAILABLE") ? "This creator doesn't offer permanent saves for this video." : error.message?.includes("LIBRARY_ACCESS_REQUIRED") ? "Unlock this creator's library first." : error.message;
      toast({ title: "Couldn't save video", description: msg, variant: "destructive" });
      return;
    }
    setVaultItems((prev) => prev.map((v) => (v.id === videoId ? { ...v, owned: true } : v)));
    await refreshBalance();
    toast({ title: "Saved to your Permanent Vault ✓", description: "Find it anytime under MY PERMANENT VAULT in your dashboard." });
  };

  const TIP_AMOUNTS = [1, 2, 3];
  const tipPreview = selectedTip ? calculateTokenTip(selectedTip) : null;

  const handleSendTip = (amount: number) => {
    toast({ title: "Tip checkout unavailable", description: "No payment has been taken. Tips need an approved payment connection." });
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
        <div className="relative h-40 overflow-hidden bg-card">
          <LivingProfileBackdrop image={profileBackdrop} />
          <div className="absolute inset-0 bg-background/30 pointer-events-none" />
        </div>
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-background/60 backdrop-blur flex items-center justify-center text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <WalletIndicator />
        </div>

        {/* Public avatar */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <CreatorTeaserAvatar creatorId={creatorId} creatorName={creatorName} avatarConfig={avatarConfig} photoPath={profilePhotoPath} unlocked={isUnlocked} unlocking={unlocking} onUnlock={() => handleUnlock()} canUnlock={libraryAvailable} isMen={isMen} />
        </div>
      </div>

      {/* Info */}
      <div className="pt-16 px-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-xl font-bold text-foreground">@{creatorName}</h2>
          {vipBadge && <span title="Elite VIP pass holder" className="text-xs font-semibold text-gold">VERIFIED VIP</span>}
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
          Make a personal offer. Payment follows acceptance and requires an available checkout.
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
          Tips start at 1 Bit-Token ($20 value). No extra tipping fee; standard creator share is 90%.
        </p>
      </div>

      {/* Tip Modal */}
      {showTipModal && createPortal(
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-background/80 backdrop-blur-sm p-3" role="dialog" aria-modal="true" aria-label="Send a tip" onClick={() => { if (!tipSent) { setShowTipModal(false); setSelectedTip(null); } }}>
          <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full max-h-[calc(100dvh-3rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="mb-2" onClick={() => { setShowTipModal(false); setSelectedTip(null); }}>Close</Button>
            <h3 className="text-lg font-bold text-foreground text-center mb-1">
           <Heart className="w-5 h-5 inline text-primary mr-1" /> Send a Tip to {creatorName}
            </h3>
            <p className="text-xs text-muted-foreground text-center mb-4">
              Tip checkout is unavailable. The amounts below are a preview only; no payment will be taken.
            </p>
            {tipNotification ? (
              <div className="bg-green-400/10 border border-green-400/30 rounded-xl p-4 text-center">
                <p className="text-sm font-bold text-green-400">{tipNotification}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {TIP_AMOUNTS.map((amt) => (
                    <Button variant="outline"
                      key={amt}
                      onClick={() => setSelectedTip(amt)}
                      className={`h-auto min-w-0 whitespace-normal py-3 rounded-lg text-sm font-bold transition-all border ${
                        selectedTip === amt
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-secondary border-border text-foreground hover:border-primary/40"
                      }`}
                    >
                      {amt} Bit-Token{amt === 1 ? "" : "s"}
                    </Button>
                  ))}
                </div>
                {tipPreview && (
                  <div className="bg-secondary/50 rounded-lg p-3 mb-4 text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between"><span>Tip value:</span><span className="text-foreground font-bold">${tipPreview.tipAmount}</span></div>
                    <div className="flex justify-between"><span>Standard platform share (10%):</span><span className="text-foreground font-bold">${tipPreview.platformShare}</span></div>
                    <div className="flex justify-between border-t border-border pt-1"><span>Standard creator share:</span><span className="text-primary font-bold">${tipPreview.creatorShare}</span></div>
                    <p>Tokens cost $25 each to buy, including the $5 purchase fee. No additional fee to tip with existing tokens.</p>
                  </div>
                )}
                <Button
                  variant="neon"
                  className="w-full"
                  disabled
                  onClick={() => selectedTip && handleSendTip(selectedTip)}
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  TIP CHECKOUT UNAVAILABLE
                </Button>
                <p role="status" className="mt-3 text-xs text-muted-foreground text-center">No payment has been taken. Tips need an approved payment connection.</p>
              </>
            )}
          </div>
        </div>, document.body
      )}

      {/* Full Library — unlock or watch */}
      <div className="px-4 mt-8">
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          Full Library
          <span className="text-xs text-muted-foreground font-normal">{vaultCount === null ? (countError ? "Unavailable" : "Checking…") : `(${vaultCount} ${vaultCount === 1 ? "item" : "items"})`}</span>
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
                     {v.url && v.media_type === "photo" ? <img src={v.url} alt={v.title} className="w-full aspect-video object-contain bg-background" /> : v.url ? (
                      <video src={v.url} className="w-full aspect-video object-cover bg-background" controls playsInline preload="none" />
                    ) : (
                      <div className="w-full aspect-video bg-secondary flex items-center justify-center"><Lock className="w-4 h-4 text-muted-foreground" /></div>
                    )}
                    <p className="text-xs font-semibold text-foreground p-2 truncate">{v.title}</p>
                    {v.allow_permanent_buyout && (v.owned ? (
                      <p className="text-[10px] font-bold text-gold px-2 pb-2">✓ IN YOUR PERMANENT VAULT</p>
                    ) : (
                      <div className="px-2 pb-2 space-y-1.5">
                        {rotatingSoon && <p role="status" className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/40 rounded-md px-2 py-1 leading-snug">Rotating soon! Purchase to keep permanently in your account.</p>}
                        <Button variant="gold" size="sm" className="w-full h-auto py-1.5 text-[10px] font-bold whitespace-normal leading-tight" disabled={buyingId === v.id} onClick={() => handleBuyout(v.id)}>
                          {buyingId === v.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save to Permanent Vault — 1 Bit-Token"}
                        </Button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {moreVault && <Button variant="outline" disabled={vaultLoading} onClick={()=>setVaultOffset(n=>n+24)}>{vaultLoading ? 'Loading…' : 'More videos'}</Button>}
            <Button variant="outline" size="lg" className="w-full mt-3 gap-2" onClick={() => handleUnlock()} disabled={unlocking || !libraryAvailable}>
              {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              EXTEND +14 DAYS — 1 BIT-TOKEN
            </Button>
            <Button variant="outline" size="lg" className="w-full mt-2 gap-2" onClick={() => handleUnlock(true)} disabled={unlocking || !libraryAvailable || !creatorId}>
              KEEP THIS CREATOR FOR A YEAR — 26 BIT-TOKENS
            </Button>
            <p className="text-center text-[10px] text-muted-foreground mt-1">26 × 14 days = 364 days ($650). Unlocking early adds time on.</p>
          </>
        ) : !libraryAvailable ? (
          <p role="status" className="py-6 text-center text-sm text-muted-foreground">{vaultCount === 0 ? "Library coming soon. Paid unlocks are unavailable until content is added." : countError ? "The library could not be checked. Paid unlocks are unavailable." : "Checking library availability…"}</p>
        ) : (
          <>
            <div className="bg-card border border-border rounded-xl p-6 text-center mb-3">
              <DttToken className="w-20 h-20 mx-auto mb-2" />
              <p className="text-sm font-bold text-foreground">Drop 1 DTT Bit-Token to unlock</p>
              <p className="text-xs text-muted-foreground mt-1">14 days of full access to every long-form video from @{creatorName}.</p>
            </div>
            <Button variant="neon" size="lg" className="w-full text-base font-semibold gap-2" onClick={() => handleUnlock()} disabled={unlocking || !creatorId}>
              {unlocking ? <Loader2 className="w-5 h-5 animate-spin" /> : <img src={dttCoin} alt="" className="w-6 h-6 object-contain" />}
              DROP 1 BIT-TOKEN — UNLOCK 14 DAYS
            </Button>
            <Button variant="outline" size="lg" className="w-full mt-2 gap-2" onClick={() => handleUnlock(true)} disabled={unlocking || !libraryAvailable || !creatorId}>
              KEEP THIS CREATOR FOR A YEAR — 26 BIT-TOKENS
            </Button>
            <p className="text-center text-[10px] text-muted-foreground mt-1">26 × 14 days = 364 days ($650). Unlocking early adds time on.</p>
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
