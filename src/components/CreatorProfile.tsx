import { useState, useRef } from "react";
import { ArrowLeft, BadgeCheck, Crown, Lock, Sparkles, Palette, Camera, Heart, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import WalletIndicator from "@/components/WalletIndicator";
import CreatorMediaGrid from "@/components/CreatorMediaGrid";
import CustomRequestModal from "@/components/CustomRequestModal";
import { ADMIN_FEE_USD } from "@/lib/tokenEconomy";

interface Vault {
  name: string;
  videoCount: number;
  price: number;
  emoji: string;
}

const VAULTS: Vault[] = [
  { name: "Cosplay Vault", videoCount: 24, price: 5, emoji: "🎭" },
  { name: "Gym Sessions", videoCount: 18, price: 10, emoji: "💪" },
  { name: "Behind the Scenes", videoCount: 32, price: 5, emoji: "🎬" },
  { name: "Exclusive Shoots", videoCount: 12, price: 15, emoji: "📸" },
  { name: "Daily Vlogs", videoCount: 45, price: 3, emoji: "🌟" },
  { name: "Collabs", videoCount: 8, price: 10, emoji: "🤝" },
];

const CreatorProfile = ({ creatorName, onBack }: { creatorName: string; onBack: () => void }) => {
  const [showRequest, setShowRequest] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [tipSent, setTipSent] = useState(false);
  const [tipNotification, setTipNotification] = useState<string | null>(null);

  const TIP_AMOUNTS = [5, 10, 20, 50, 100];

  const handleSendTip = (amount: number) => {
    const netAmount = amount - ADMIN_FEE_USD;
    // In production, this triggers a NOWPayments invoice
    setTipSent(true);
    setTipNotification(`Tip of $${amount} sent! Creator receives $${netAmount} (after $${ADMIN_FEE_USD} platform fee).`);
    setTimeout(() => { setShowTipModal(false); setTipSent(false); setSelectedTip(null); setTipNotification(null); }, 3000);
  };

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProfileImage(url);
    }
  };

  return (
    <div className="mobile-scroll-shell">
      {/* Header */}
      <div className="relative">
        <div className="h-40 bg-gradient-to-br from-primary/20 via-card to-card" />
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-background/60 backdrop-blur flex items-center justify-center text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <WalletIndicator />
        </div>

        {/* Avatar with upload */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full bg-secondary border-4 border-background flex items-center justify-center overflow-hidden neon-glow group"
          >
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary">
                {creatorName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-6 h-6 text-primary" />
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfileUpload} />
        </div>
      </div>

      {/* Info */}
      <div className="pt-16 px-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-xl font-bold text-foreground">{creatorName}</h2>
          <BadgeCheck className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground mt-1">Content Creator • 0 followers</p>

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
          Premium commissions from $500 — $10,001 • Secure escrow via NOWPayments
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
          Show your support — $1 platform fee per tip
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
              A flat ${ADMIN_FEE_USD} DTT Media fee is deducted. The rest goes to the creator.
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
                    <div className="flex justify-between"><span>DTT Media Fee:</span><span className="text-destructive font-bold">-${ADMIN_FEE_USD}</span></div>
                    <div className="flex justify-between border-t border-border pt-1"><span>Creator Receives:</span><span className="text-primary font-bold">${selectedTip - ADMIN_FEE_USD}</span></div>
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

      {/* Media Grid */}
      <CreatorMediaGrid />

      {/* Vault Grid */}
      <div className="px-4 mt-8">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          Vault Collection
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {VAULTS.map((vault) => (
            <button
              key={vault.name}
              className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 transition-all group"
            >
              <div className="text-3xl mb-2">{vault.emoji}</div>
              <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {vault.name}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">{vault.videoCount} videos</p>
              <div className="mt-3 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-primary" />
                <span className="text-sm font-bold text-primary">{vault.price} Bit-Tokens</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Full Access Bundle */}
      <div className="px-4 mt-6">
        <Button variant="neon" size="lg" className="w-full text-base font-semibold gap-2">
          <Sparkles className="w-5 h-5" />
          6 Bit-Token Mega Pack
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Unlock all {VAULTS.reduce((a, v) => a + v.videoCount, 0)} videos across {VAULTS.length} vaults
        </p>
      </div>

      {/* Custom Request Modal */}
      {showRequest && (
        <CustomRequestModal creatorName={creatorName} onClose={() => setShowRequest(false)} />
      )}
    </div>
  );
};

export default CreatorProfile;
