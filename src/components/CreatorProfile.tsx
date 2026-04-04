import { ArrowLeft, BadgeCheck, Crown, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import WalletIndicator from "@/components/WalletIndicator";

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
  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="relative">
        <div className="h-40 bg-gradient-to-br from-primary/20 via-card to-card" />
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-background/60 backdrop-blur flex items-center justify-center text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <WalletIndicator />
        </div>

        {/* Avatar */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <div className="w-24 h-24 rounded-full bg-secondary border-4 border-background flex items-center justify-center text-2xl font-bold text-primary neon-glow">
            {creatorName.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="pt-16 px-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-xl font-bold text-foreground">{creatorName}</h2>
          <BadgeCheck className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground mt-1">Content Creator • 48.2K followers</p>

        {/* King of the Vault */}
        <div className="mt-4 mx-auto max-w-xs bg-secondary/50 border border-gold/30 rounded-lg px-4 py-3 gold-glow">
          <div className="flex items-center justify-center gap-2">
            <Crown className="w-5 h-5 text-gold" />
            <span className="text-sm font-semibold text-gold">King of the Vault</span>
          </div>
          <p className="text-sm text-foreground mt-1 font-medium">@DiamondHands_99</p>
          <p className="text-xs text-muted-foreground">Top supporter this month</p>
        </div>
      </div>

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
                <span className="text-sm font-bold text-primary">${vault.price}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Full Access Bundle */}
      <div className="px-4 mt-6">
        <Button variant="neon" size="lg" className="w-full text-base font-semibold gap-2">
          <Sparkles className="w-5 h-5" />
          Full Access Bundle — $39.99
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Unlock all {VAULTS.reduce((a, v) => a + v.videoCount, 0)} videos across {VAULTS.length} vaults
        </p>
      </div>
    </div>
  );
};

export default CreatorProfile;
