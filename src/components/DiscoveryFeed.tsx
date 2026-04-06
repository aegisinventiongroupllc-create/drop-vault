import { useState, useEffect } from "react";
import { Heart, MessageCircle, Share2, Bookmark, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import WalletIndicator from "@/components/WalletIndicator";

interface VideoItem {
  id: string;
  creator: string;
  creatorAvatar: string;
  description: string;
  likes: number;
  comments: number;
  color: string;
}

const MOCK_VIDEOS: VideoItem[] = [
  { id: "1", creator: "LunaCosplay", creatorAvatar: "LC", description: "✨ New cosplay reveal — Marin Kitagawa ✨ #cosplay #anime", likes: 12400, comments: 892, color: "from-pink-900/40 to-purple-900/40" },
  { id: "2", creator: "FitJessie", creatorAvatar: "FJ", description: "Morning gym routine 💪 Full video in my vault!", likes: 8200, comments: 431, color: "from-blue-900/40 to-teal-900/40" },
  { id: "3", creator: "BlondieVibes", creatorAvatar: "BV", description: "Beach day vibes 🌊 Link in bio for exclusive content", likes: 15600, comments: 1203, color: "from-amber-900/40 to-orange-900/40" },
  { id: "4", creator: "TwinFlames", creatorAvatar: "TF", description: "Dance challenge with my bestie 💃🔥", likes: 22100, comments: 1870, color: "from-red-900/40 to-pink-900/40" },
  { id: "5", creator: "PetiteSophie", creatorAvatar: "PS", description: "GRWM for a night out 💄✨ #grwm #nightout", likes: 9800, comments: 672, color: "from-violet-900/40 to-indigo-900/40" },
];

const VideoCard = ({ video, onCreatorClick }: { video: VideoItem; onCreatorClick: (name: string) => void }) => {
  const [seconds, setSeconds] = useState(0);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s >= 30) {
          setLocked(true);
          clearInterval(interval);
          return 30;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

  return (
    <div className="relative w-full h-[calc(100vh-8rem)] snap-start flex-shrink-0">
      {/* Video placeholder bg */}
      <div className={`absolute inset-0 bg-gradient-to-b ${video.color} bg-card`} />

      {/* Animated shimmer to simulate playing video */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-6xl font-display text-foreground/5 tracking-widest select-none">▶</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-1000 neon-glow-sm"
          style={{ width: `${(seconds / 30) * 100}%` }}
        />
      </div>

      {/* Blur overlay */}
      {locked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/60 backdrop-blur-xl">
          <Lock className="w-12 h-12 text-primary animate-pulse-glow" />
          <h3 className="text-xl font-semibold text-foreground">Preview ended</h3>
           <Button variant="neon" size="lg" className="text-base px-8">
             Unlock with 1 Bit-Token
           </Button>
          <div className="flex items-center gap-2 mt-2 px-4 py-2 rounded-full bg-secondary/80 border border-border">
            <span className="text-xs text-primary font-medium">Creator keeps 90%</span>
            <span className="text-xs text-muted-foreground">• Platform fee 10%</span>
          </div>
          <a href="mailto:dropthatthingmedia@gmail.com" className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground hover:text-primary transition-colors">
            <Mail className="w-3 h-3" />
            Support
          </a>
        </div>
      )}

      {/* Right action bar */}
      <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5">
        <button className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-primary">
            {video.creatorAvatar}
          </div>
        </button>
        <button className="flex flex-col items-center gap-1 text-foreground hover:text-primary transition-colors">
          <Heart className="w-7 h-7" />
          <span className="text-xs">{formatCount(video.likes)}</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-foreground hover:text-primary transition-colors">
          <MessageCircle className="w-7 h-7" />
          <span className="text-xs">{formatCount(video.comments)}</span>
        </button>
        <button className="text-foreground hover:text-primary transition-colors">
          <Share2 className="w-6 h-6" />
        </button>
        <button className="text-foreground hover:text-primary transition-colors">
          <Bookmark className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-4 right-16 z-20">
        <button
          className="text-base font-semibold text-foreground hover:text-primary transition-colors"
          onClick={() => onCreatorClick(video.creator)}
        >
          @{video.creator}
        </button>
        <p className="text-sm text-foreground/80 mt-1 line-clamp-2">{video.description}</p>
      </div>
    </div>
  );
};

const DiscoveryFeed = ({ onCreatorClick }: { onCreatorClick: (name: string) => void }) => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-gradient-to-b from-background via-background/80 to-transparent pb-4">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h1 className="font-display text-lg font-bold tracking-wider">
            DROP<span className="text-primary">THAT</span>THING
          </h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setSearchOpen(!searchOpen)} className="text-foreground hover:text-primary transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <WalletIndicator />
          </div>
        </div>

        {/* Search */}
        {searchOpen && (
          <div className="px-4 pb-2">
            <input
              type="text"
              placeholder="Search creators, videos..."
              className="w-full bg-secondary rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>
        )}

        {/* Categories */}
        <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground neon-glow-sm"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Video feed */}
      <div className="flex-1 snap-y snap-mandatory overflow-y-auto pt-28 pb-16">
        {MOCK_VIDEOS.map((video) => (
          <VideoCard key={video.id} video={video} onCreatorClick={onCreatorClick} />
        ))}
      </div>
    </div>
  );
};

export default DiscoveryFeed;
