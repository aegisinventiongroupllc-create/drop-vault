import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Heart, MessageCircle, Share2, Bookmark, Lock, Volume2, VolumeX, X, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import WalletIndicator from "@/components/WalletIndicator";
import GhostCountryMessage from "@/components/GhostCountryMessage";
import { TOKEN_INVOICE_USD, BUNDLE_INVOICE_USD, BUNDLE_TOKENS } from "@/lib/tokenEconomy";
import type { VaultType } from "@/lib/tokenEconomy";

interface VideoItem {
  id: string;
  creator: string;
  creatorAvatar: string;
  title: string;
  description: string;
  likes: number;
  comments: number;
  color: string;
  vault: VaultType;
  country: string;
}

const MOCK_VIDEOS: VideoItem[] = [
  { id: "1", creator: "LunaCosplay", creatorAvatar: "LC", title: "Marin Kitagawa Cosplay Reveal", description: "✨ New cosplay reveal — Marin Kitagawa ✨ #cosplay #anime", likes: 12400, comments: 892, color: "from-pink-900/40 to-purple-900/40", vault: "women", country: "US" },
  { id: "2", creator: "FitJessie", creatorAvatar: "FJ", title: "Morning Gym Routine", description: "Morning gym routine 💪 Full video in my vault!", likes: 8200, comments: 431, color: "from-blue-900/40 to-teal-900/40", vault: "women", country: "US" },
  { id: "3", creator: "BlondieVibes", creatorAvatar: "BV", title: "Beach Day Vibes", description: "Beach day vibes 🌊 Link in bio for exclusive content", likes: 15600, comments: 1203, color: "from-amber-900/40 to-orange-900/40", vault: "women", country: "GB" },
  { id: "4", creator: "TwinFlames", creatorAvatar: "TF", title: "Dance Challenge Duo", description: "Dance challenge with my bestie 💃🔥", likes: 22100, comments: 1870, color: "from-red-900/40 to-pink-900/40", vault: "women", country: "BR" },
  { id: "5", creator: "PetiteSophie", creatorAvatar: "PS", title: "Night Out GRWM", description: "GRWM for a night out 💄✨ #grwm #nightout", likes: 9800, comments: 672, color: "from-violet-900/40 to-indigo-900/40", vault: "women", country: "FR" },
  { id: "6", creator: "AlphaFlex", creatorAvatar: "AF", title: "Morning Routine Full Set", description: "Morning routine — full set in the vault 💪", likes: 7400, comments: 340, color: "from-blue-900/40 to-slate-900/40", vault: "men", country: "US" },
  { id: "7", creator: "KingCole", creatorAvatar: "KC", title: "Behind The Scenes Shoot", description: "Behind the scenes shoot 📸🔥", likes: 11200, comments: 560, color: "from-slate-900/40 to-blue-900/40", vault: "men", country: "GB" },
  { id: "8", creator: "RexFitness", creatorAvatar: "RF", title: "5AM Grind Session", description: "5AM grind — unlock for the full 30min session", likes: 6800, comments: 290, color: "from-cyan-900/40 to-blue-900/40", vault: "men", country: "AU" },
];

export { MOCK_VIDEOS };
export type { VideoItem };

const VideoCard = memo(({ video, onCreatorClick }: { video: VideoItem; onCreatorClick: (name: string) => void }) => {
  const { toast } = useToast();
  const [seconds, setSeconds] = useState(0);
  const [locked, setLocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [following, setFollowing] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(video.likes);
  const [bookmarked, setBookmarked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<{ user: string; text: string }[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Check if already bookmarked
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("dtt_bookmarks") || "[]");
      setBookmarked(saved.includes(video.creator));
    } catch { /* ignore */ }
  }, [video.creator]);

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

  const handleLike = () => {
    setLiked(prev => !prev);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  const handleBookmark = () => {
    try {
      const saved: string[] = JSON.parse(localStorage.getItem("dtt_bookmarks") || "[]");
      let updated: string[];
      if (bookmarked) {
        updated = saved.filter(c => c !== video.creator);
        toast({ title: "Removed from Library", description: `@${video.creator} removed` });
      } else {
        updated = [...new Set([...saved, video.creator])];
        toast({ title: "Saved to Library", description: `@${video.creator} added to My Library` });
      }
      localStorage.setItem("dtt_bookmarks", JSON.stringify(updated));
      setBookmarked(!bookmarked);
    } catch { /* ignore */ }
  };

  const handleShare = async () => {
    const shareData = { title: video.title, text: `Check out @${video.creator} on DropThatThing!`, url: window.location.href };
    try {
      if (navigator.share) { await navigator.share(shareData); }
      else { await navigator.clipboard.writeText(shareData.url); toast({ title: "Link copied!" }); }
    } catch { /* cancelled */ }
  };

  const handlePostComment = () => {
    if (!commentText.trim()) return;
    setComments(prev => [...prev, { user: "You", text: commentText.trim() }]);
    setCommentText("");
  };

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
      <button onClick={() => setMuted(!muted)} className="absolute bottom-24 left-3 z-20 w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center text-foreground active:scale-95 transition-transform">
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
        <button className="flex flex-col items-center gap-1 active:scale-95 transition-transform" onClick={() => onCreatorClick(video.creator)}>
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-primary">{video.creatorAvatar}</div>
        </button>
        <button onClick={() => setFollowing(!following)} className={`text-xs font-bold px-2 py-1 rounded-full transition-all active:scale-95 ${following ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}>
          {following ? "FOLLOWING" : "FOLLOW"}
        </button>
        <button onClick={handleLike} className={`flex flex-col items-center gap-1 active:scale-90 transition-all ${liked ? "text-red-500" : "text-foreground hover:text-primary"}`}>
          <Heart className="w-7 h-7" fill={liked ? "currentColor" : "none"} />
          <span className="text-xs">{formatCount(likeCount)}</span>
        </button>
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1 text-foreground hover:text-primary active:scale-90 transition-all">
          <MessageCircle className="w-7 h-7" />
          <span className="text-xs">{formatCount(video.comments + comments.length)}</span>
        </button>
        <button onClick={handleShare} className="text-foreground hover:text-primary active:scale-90 transition-all">
          <Share2 className="w-6 h-6" />
        </button>
        <button onClick={handleBookmark} className={`active:scale-90 transition-all ${bookmarked ? "text-primary" : "text-foreground hover:text-primary"}`}>
          <Bookmark className="w-6 h-6" fill={bookmarked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Comments drawer */}
      {showComments && (
        <div className="absolute inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-background/40" onClick={() => setShowComments(false)} />
          <div className="relative bg-card border-t border-border rounded-t-2xl max-h-[60vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground tracking-wider">COMMENTS</h3>
              <button onClick={() => setShowComments(false)} className="text-muted-foreground hover:text-foreground active:scale-95 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[100px]">
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
              )}
              {comments.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">{c.user[0]}</div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{c.user}</p>
                    <p className="text-xs text-foreground/80">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
                placeholder="Add a comment..."
                className="flex-1 bg-secondary rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button onClick={handlePostComment} className="text-primary hover:text-primary/80 active:scale-95 transition-all disabled:opacity-40" disabled={!commentText.trim()}>
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 right-16 z-20">
        <button className="text-base font-semibold text-foreground hover:text-primary active:text-primary/80 transition-colors" onClick={() => onCreatorClick(video.creator)}>@{video.creator}</button>
        <p className="text-xs font-bold text-primary/90 mt-0.5">{video.title}</p>
        <p className="text-sm text-foreground/80 mt-1 line-clamp-2">{video.description}</p>
      </div>
    </div>
  );
});
const DiscoveryFeed = ({ onCreatorClick, vault, onSearch, hasVaultToggle, countryFilter, searchQuery }: { onCreatorClick: (name: string) => void; vault: VaultType; onSearch: () => void; hasVaultToggle?: boolean; countryFilter?: string; searchQuery?: string }) => {
  const filteredVideos = MOCK_VIDEOS.filter(v => {
    if (v.vault !== vault) return false;
    if (countryFilter && countryFilter !== "GLOBAL" && v.country !== countryFilter) return false;
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!v.title.toLowerCase().includes(q) && !v.creator.toLowerCase().includes(q) && !v.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-[100dvh]">
      <div className={`fixed left-0 right-0 z-30 bg-gradient-to-b from-background via-background/80 to-transparent pb-4 ${hasVaultToggle ? "top-10" : "top-0"}`}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h1 className="font-display text-lg font-bold tracking-wider">DROP<span className="text-primary">THAT</span>THING</h1>
          <WalletIndicator />
        </div>
        <button onClick={onSearch} className="mx-4 w-[calc(100%-2rem)] bg-secondary rounded-xl px-4 py-2.5 text-left text-sm text-muted-foreground hover:bg-secondary/80 active:bg-secondary/60 transition-colors">
          Search creators...
        </button>
      </div>

      <div className={`h-[100dvh] snap-y snap-mandatory overflow-y-auto bottom-nav-scroll-area ${hasVaultToggle ? "pt-[9rem]" : "pt-[7rem]"}`}>
        {filteredVideos.length > 0 ? (
          filteredVideos.map((video) => (
            <VideoCard key={video.id} video={video} onCreatorClick={onCreatorClick} />
          ))
        ) : (
          countryFilter && countryFilter !== "GLOBAL" ? (
            <GhostCountryMessage countryCode={countryFilter} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No creators found</div>
          )
        )}
      </div>
    </div>
  );
};

export default DiscoveryFeed;