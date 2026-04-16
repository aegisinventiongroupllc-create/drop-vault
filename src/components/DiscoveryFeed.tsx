import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Heart, MessageCircle, Share2, Bookmark, Lock, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import WalletIndicator from "@/components/WalletIndicator";
import { TOKEN_INVOICE_USD, BUNDLE_INVOICE_USD, BUNDLE_TOKENS } from "@/lib/tokenEconomy";
import type { VaultType } from "@/lib/tokenEconomy";

interface VideoItem {
  id: string;
  creator: string;
  creatorAvatar: string;
  description: string;
  likes: number;
  comments: number;
  color: string;
  vault: VaultType;
}

const MOCK_VIDEOS: VideoItem[] = [
  { id: "1", creator: "LunaCosplay", creatorAvatar: "LC", description: "✨ New cosplay reveal — Marin Kitagawa ✨ #cosplay #anime", likes: 12400, comments: 892, color: "from-pink-900/40 to-purple-900/40", vault: "women" },
  { id: "2", creator: "FitJessie", creatorAvatar: "FJ", description: "Morning gym routine 💪 Full video in my vault!", likes: 8200, comments: 431, color: "from-blue-900/40 to-teal-900/40", vault: "women" },
  { id: "3", creator: "BlondieVibes", creatorAvatar: "BV", description: "Beach day vibes 🌊 Link in bio for exclusive content", likes: 15600, comments: 1203, color: "from-amber-900/40 to-orange-900/40", vault: "women" },
  { id: "4", creator: "TwinFlames", creatorAvatar: "TF", description: "Dance challenge with my bestie 💃🔥", likes: 22100, comments: 1870, color: "from-red-900/40 to-pink-900/40", vault: "women" },
  { id: "5", creator: "PetiteSophie", creatorAvatar: "PS", description: "GRWM for a night out 💄✨ #grwm #nightout", likes: 9800, comments: 672, color: "from-violet-900/40 to-indigo-900/40", vault: "women" },
  { id: "6", creator: "AlphaFlex", creatorAvatar: "AF", description: "Morning routine — full set in the vault 💪", likes: 7400, comments: 340, color: "from-blue-900/40 to-slate-900/40", vault: "men" },
  { id: "7", creator: "KingCole", creatorAvatar: "KC", description: "Behind the scenes shoot 📸🔥", likes: 11200, comments: 560, color: "from-slate-900/40 to-blue-900/40", vault: "men" },
  { id: "8", creator: "RexFitness", creatorAvatar: "RF", description: "5AM grind — unlock for the full 30min session", likes: 6800, comments: 290, color: "from-cyan-900/40 to-blue-900/40", vault: "men" },
];

const VideoCard = memo(({ video, onCreatorClick }: { video: VideoItem; onCreatorClick: (name: string) => void }) => {
  const [seconds, setSeconds] = useState(0);
  const [locked, setLocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [following, setFollowing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || locked) return;
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s >= 15) { setLocked(true); clearInterval(interval); return 15; }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isVisible, locked]);

  const formatCount = useCallback((n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString(), []);

  return (
    <div ref={cardRef} className="relative w-full h-[calc(100vh-8rem)] snap-start flex-shrink-0">
      <div className={`absolute inset-0 bg-gradient-to-b ${video.color} bg-card`} />
      {isVisible && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl font-display text-foreground/5 tracking-widest select-none">▶</div>
          </div>
        </div>
      )}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted">
        <div className="h-full bg-primary transition-all duration-1000 neon-glow-sm" style={{ width: `${(seconds / 15) * 100}%` }} />
      </div>
      <button onClick={() => setMuted(!muted)} className="absolute bottom-24 left-3 z-20 w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center text-foreground">
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      {locked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/60 backdrop-blur-xl">
          <Lock className="w-12 h-12 text-primary animate-pulse-glow" />
          <h3 className="text-xl font-semibold text-foreground">Preview ended</h3>
          <Button variant="neon" size="lg" className="text-base px-8">
            UNLOCK VAULT — ${TOKEN_INVOICE_USD}
          </Button>
          <p className="text-xs text-muted-foreground">or <span className="text-primary font-bold">{BUNDLE_TOKENS} Tokens for ${BUNDLE_INVOICE_USD}</span></p>
          <div className="flex items-center gap-2 mt-2 px-4 py-2 rounded-full bg-secondary/80 border border-border">
            <span className="text-xs text-primary font-medium">Creator keeps 90%</span>
            <span className="text-xs text-muted-foreground">• $1 Platform Fee</span>
          </div>
          <p className="text-[9px] text-muted-foreground/60">14-day access • 336 hours</p>
        </div>
      )}

      <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5">
        <button className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-primary">{video.creatorAvatar}</div>
        </button>
        <button onClick={() => setFollowing(!following)} className={`text-xs font-bold px-2 py-1 rounded-full transition-all ${following ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
          {following ? "FOLLOWING" : "FOLLOW"}
        </button>
        <button className="flex flex-col items-center gap-1 text-foreground hover:text-primary transition-colors"><Heart className="w-7 h-7" /><span className="text-xs">{formatCount(video.likes)}</span></button>
        <button className="flex flex-col items-center gap-1 text-foreground hover:text-primary transition-colors"><MessageCircle className="w-7 h-7" /><span className="text-xs">{formatCount(video.comments)}</span></button>
        <button className="text-foreground hover:text-primary transition-colors"><Share2 className="w-6 h-6" /></button>
        <button className="text-foreground hover:text-primary transition-colors"><Bookmark className="w-6 h-6" /></button>
      </div>

      <div className="absolute bottom-4 left-4 right-16 z-20">
        <button className="text-base font-semibold text-foreground hover:text-primary transition-colors" onClick={() => onCreatorClick(video.creator)}>@{video.creator}</button>
        <p className="text-sm text-foreground/80 mt-1 line-clamp-2">{video.description}</p>
      </div>
    </div>
  );
});

const DiscoveryFeed = ({ onCreatorClick, vault, onSearch, hasVaultToggle }: { onCreatorClick: (name: string) => void; vault: VaultType; onSearch: () => void; hasVaultToggle?: boolean }) => {
  const filteredVideos = MOCK_VIDEOS.filter(v => v.vault === vault);

  return (
    <div className="flex flex-col h-full">
      <div className={`fixed left-0 right-0 z-30 bg-gradient-to-b from-background via-background/80 to-transparent pb-4 ${hasVaultToggle ? "top-10" : "top-0"}`}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h1 className="font-display text-lg font-bold tracking-wider">DROP<span className="text-primary">THAT</span>THING</h1>
          <WalletIndicator />
        </div>
        <button onClick={onSearch} className="mx-4 w-[calc(100%-2rem)] bg-secondary rounded-xl px-4 py-2.5 text-left text-sm text-muted-foreground">
          Search creators...
        </button>
      </div>

      <div className={`flex-1 snap-y snap-mandatory overflow-y-auto pb-16 ${hasVaultToggle ? "pt-[9rem]" : "pt-[7rem]"}`}>
        {filteredVideos.map((video) => (
          <VideoCard key={video.id} video={video} onCreatorClick={onCreatorClick} />
        ))}
      </div>
    </div>
  );
};

export default DiscoveryFeed;
