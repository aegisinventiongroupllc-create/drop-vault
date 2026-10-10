import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Heart, MessageCircle, Share2, Lock, Volume2, VolumeX, X, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import WalletIndicator from "@/components/WalletIndicator";
import GhostCountryMessage from "@/components/GhostCountryMessage";
import LegalFooter from "@/components/LegalFooter";
import { supabase } from "@/integrations/supabase/client";
import { TOKEN_INVOICE_USD, BUNDLE_INVOICE_USD, BUNDLE_TOKENS } from "@/lib/tokenEconomy";
import type { VaultType } from "@/lib/tokenEconomy";
import { toggleHeart } from "@/hooks/useHearts";
import ProfileAvatar from "@/components/ProfileAvatar";

interface VideoItem {
  id: string;
  creator: string;
  creatorAvatar: unknown;
  creatorPhotoPath?: string | null;
  title: string;
  description: string;
  likes: number;
  comments: number;
  color: string;
  vault: VaultType;
  country: string;
  tags?: string[];
  videoUrl?: string;
  creatorId?: string;
}

interface CommentRow { id: string; author_id: string; parent_id: string | null; body: string; created_at: string }
interface PublicIdentity { display_name: string | null; avatar_config: unknown }

// Production launch — empty until real creators sign up
const MOCK_VIDEOS: VideoItem[] = [];

export { MOCK_VIDEOS };
export type { VideoItem };

const VideoCard = memo(({ video, onCreatorClick, initiallyLiked, viewerId }: { video: VideoItem; onCreatorClick: (name: string) => void; initiallyLiked: boolean; viewerId: string | null }) => {
  const { toast } = useToast();
  const [seconds, setSeconds] = useState(0);
  const [locked, setLocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [following, setFollowing] = useState(false);
  const [liked, setLiked] = useState(initiallyLiked);
  const [likeCount, setLikeCount] = useState(video.likes);
  const [heartBusy, setHeartBusy] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentAuthors, setCommentAuthors] = useState<Record<string, PublicIdentity>>({});
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const isOwner = !!viewerId && viewerId === video.creatorId;
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isRealTeaser = !!video.videoUrl;

  useEffect(() => { setLiked(initiallyLiked); }, [initiallyLiked]);
  useEffect(() => { setLikeCount(video.likes); }, [video.likes]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Real teasers from creators are free in full — no paywall countdown
    if (isRealTeaser) return;
    if (!isVisible || locked) return;
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s >= 15) { setLocked(true); clearInterval(interval); return 15; }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isVisible, locked, isRealTeaser]);

  // Play/pause the real teaser video based on viewport visibility
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isVisible) { v.play().catch(() => {}); } else { v.pause(); }
  }, [isVisible]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const formatCount = useCallback((n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString(), []);

  const handleLike = async () => {
    if (!video.creatorId || heartBusy) return;
    if (isOwner) { toast({ title: "That's you!", description: "You can't heart your own profile." }); return; }
    setHeartBusy(true);
    const next = await toggleHeart(video.creatorId, liked);
    setHeartBusy(false);
    if (next === null) { toast({ title: "Sign in to save creators", variant: "destructive" }); return; }
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    toast(next
      ? { title: "Saved to your library", description: `@${video.creator} added. Spend 1 Bit-Token on their profile to unlock 14 days.` }
      : { title: "Removed from your library", description: `@${video.creator} removed` });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/?creator=${encodeURIComponent(video.creator)}`;
    const shareData = { title: `DTT — @${video.creator}`, text: `Check out @${video.creator} on DTT!`, url };
    try {
      if (navigator.share) { await navigator.share(shareData); }
      else { await navigator.clipboard.writeText(url); toast({ title: "Link copied!" }); }
    } catch { /* cancelled */ }
  };

  const loadComments = useCallback(async () => {
    if (!video.creatorId) return;
    const { data } = await supabase
      .from("creator_comments")
      .select("id, author_id, parent_id, body, created_at")
      .eq("creator_id", video.creatorId)
      .order("created_at", { ascending: true })
      .limit(200);
    const rows = (data ?? []) as CommentRow[];
    setComments(rows);
    const ids = Array.from(new Set(rows.map((comment) => comment.author_id)));
    if (ids.length) {
      const { data: authors } = await supabase.from("public_profiles").select("user_id, display_name, avatar_config").in("user_id", ids);
      const mapped: Record<string, PublicIdentity> = {};
      authors?.forEach((author) => { mapped[author.user_id] = { display_name: author.display_name, avatar_config: author.avatar_config }; });
      setCommentAuthors(mapped);
    }
  }, [video.creatorId]);

  useEffect(() => { if (showComments) loadComments(); }, [showComments, loadComments]);

  const handlePostComment = async () => {
    const body = commentText.trim();
    if (!body || !video.creatorId) return;
    if (!viewerId) { toast({ title: "Sign in to message this creator", variant: "destructive" }); return; }
    if (isOwner && !replyTo) { toast({ title: "Pick a comment to reply to" }); return; }
    const { error } = await supabase.from("creator_comments").insert({
      creator_id: video.creatorId,
      media_id: video.id,
      author_id: viewerId,
      parent_id: isOwner ? replyTo!.id : null,
      body: body.slice(0, 1000),
    });
    if (error) { toast({ title: "Couldn't send", description: error.message, variant: "destructive" }); return; }
    setCommentText(""); setReplyTo(null);
    if (!isOwner) toast({ title: "Sent privately", description: `Only @${video.creator} can read this.` });
    loadComments();
  };

  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesFor = (id: string) => comments.filter((c) => c.parent_id === id);

  return (
    <div ref={cardRef} className="relative w-full h-[calc(100vh-8rem)] snap-start flex-shrink-0">
      <div className={`absolute inset-0 bg-gradient-to-b ${video.color} bg-card`} />
      {isRealTeaser && (
        <video
          ref={videoRef}
          src={video.videoUrl}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          playsInline
          muted={muted}
          preload="metadata"
        />
      )}
      {isVisible && !isRealTeaser && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl font-display text-foreground/5 tracking-widest select-none">▶</div>
          </div>
        </div>
      )}
      {!isRealTeaser && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted">
          <div className="h-full bg-primary transition-all duration-1000 neon-glow-sm" style={{ width: `${(seconds / 15) * 100}%` }} />
        </div>
      )}
      <button onClick={() => setMuted(!muted)} className="absolute bottom-24 left-3 z-20 w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center text-foreground active:scale-95 transition-transform">
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      {locked && !isRealTeaser && (
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
          <p className="text-[9px] text-muted-foreground/60 max-w-[80%] text-center px-4">
            Direct LTC payments · All sales final · Crypto irreversible
          </p>
        </div>
      )}

      <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5">
        <button className="flex flex-col items-center gap-1 active:scale-95 transition-transform" onClick={() => onCreatorClick(video.creator)}>
          <ProfileAvatar config={video.creatorAvatar} creatorPhotoPath={video.creatorPhotoPath} label={video.creator} />
        </button>
        <button onClick={() => setFollowing(!following)} className={`text-xs font-bold px-2 py-1 rounded-full transition-all active:scale-95 ${following ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}>
          {following ? "FOLLOWING" : "FOLLOW"}
        </button>
        <button onClick={handleLike} disabled={heartBusy} aria-label={liked ? "Remove from library" : "Save to library"} className={`flex flex-col items-center gap-1 active:scale-90 transition-all ${liked ? "text-red-500" : "text-foreground hover:text-primary"}`}>
          <Heart className="w-7 h-7" fill={liked ? "currentColor" : "none"} />
          <span className="text-xs">{formatCount(likeCount)}</span>
        </button>
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1 text-foreground hover:text-primary active:scale-90 transition-all">
          <MessageCircle className="w-7 h-7" />
          <span className="text-[10px] font-bold">{isOwner ? "INBOX" : "DM"}</span>
        </button>
        <button onClick={handleShare} className="text-foreground hover:text-primary active:scale-90 transition-all">
          <Share2 className="w-6 h-6" />
        </button>
      </div>

      {/* Comments drawer */}
      {showComments && (
        <div className="absolute inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-background/40" onClick={() => setShowComments(false)} />
          <div className="relative bg-card border-t border-border rounded-t-2xl max-h-[60vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground tracking-wider">{isOwner ? "FAN MESSAGES" : "MESSAGE CREATOR"}</h3>
              <button onClick={() => setShowComments(false)} className="text-muted-foreground hover:text-foreground active:scale-95 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="px-4 pt-2 text-[10px] text-muted-foreground tracking-wider">
              {isOwner ? "PRIVATE INBOX — ONLY YOU SEE THESE. TAP A MESSAGE TO REPLY." : `PRIVATE — ONLY @${video.creator.toUpperCase()} CAN READ YOUR MESSAGES`}
            </p>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[100px]">
              {topLevel.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">{isOwner ? "No fan messages yet." : "Send a private message to this creator."}</p>
              )}
              {topLevel.map((c) => (
                <div key={c.id} className="space-y-1">
                  <button
                    disabled={!isOwner}
                    onClick={() => setReplyTo(c)}
                    className={`w-full text-left rounded-lg p-2 ${replyTo?.id === c.id ? "bg-primary/10 border border-primary/40" : "bg-secondary/50"}`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <ProfileAvatar config={commentAuthors[c.author_id]?.avatar_config} label={commentAuthors[c.author_id]?.display_name || "Fan"} className="h-7 w-7" />
                      <p className="text-[10px] font-bold text-muted-foreground">@{commentAuthors[c.author_id]?.display_name || (c.author_id === viewerId ? "you" : "fan")} · {new Date(c.created_at).toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-foreground/90 break-words">{c.body}</p>
                  </button>
                  {repliesFor(c.id).map((r) => (
                    <div key={r.id} className="ml-4 rounded-lg p-2 bg-primary/10">
                      <div className="mb-1 flex items-center gap-2"><ProfileAvatar config={video.creatorAvatar} label={video.creator} className="h-7 w-7" /><p className="text-[10px] font-bold text-primary">@{video.creator}</p></div>
                      <p className="text-xs text-foreground/90 break-words">{r.body}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
                placeholder={isOwner ? (replyTo ? "Write your reply..." : "Tap a message to reply") : "Private message..."}
                maxLength={1000}
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
  const [liveVideos, setLiveVideos] = useState<VideoItem[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [myHearts, setMyHearts] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      setViewerId(uid);
      if (!uid) return;
      const { data } = await supabase.from("creator_hearts").select("creator_id").eq("user_id", uid);
      setMyHearts(new Set((data ?? []).map((r) => r.creator_id)));
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: media } = await supabase
        .from("creator_media")
        .select("id, creator_id, storage_path, title")
        .eq("bucket", "teasers")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!media || cancelled) return;
      const creatorIds = Array.from(new Set(media.map((m) => m.creator_id)));
      const { data: profs } = await supabase
        .from("public_profiles")
        .select("user_id, display_name, country, avatar_config, profile_photo_path, vault_side, tags")
        .in("user_id", creatorIds);
      const { data: counts } = await supabase.rpc("get_heart_counts", { _creator_ids: creatorIds });
      const countMap: Record<string, number> = {};
      (counts ?? []).forEach((r: { creator_id: string; hearts: number }) => { countMap[r.creator_id] = Number(r.hearts); });
      const profMap: Record<string, { name: string; country: string; avatar: unknown; photoPath: string | null; side: VaultType; tags: string[] }> = {};
      profs?.forEach((p) => {
        profMap[p.user_id] = {
          name: p.display_name || "creator",
          country: p.country || "GLOBAL",
          avatar: p.avatar_config,
          photoPath: p.profile_photo_path,
          side: p.vault_side === "men" ? "men" : "women",
          tags: Array.isArray((p as { tags?: string[] }).tags) ? (p as { tags?: string[] }).tags! : [],
        };
      });
      const items: VideoItem[] = media.map((m) => {
        const { data: pub } = supabase.storage.from("teasers").getPublicUrl(m.storage_path);
        const prof = profMap[m.creator_id];
        const name = prof?.name || "creator";
        return {
          id: m.id,
          creator: name,
          creatorAvatar: prof?.avatar,
          creatorPhotoPath: prof?.photoPath,
          title: m.title || "Teaser",
          description: "",
          likes: countMap[m.creator_id] ?? 0,
          creatorId: m.creator_id,
          comments: 0,
          color: "from-primary/20 to-background",
          vault: prof?.side ?? "women",
          country: prof?.country || "GLOBAL",
          videoUrl: pub.publicUrl,
        };
      });
      // Most-followed creators first (top 20), rest shuffled for discovery
      const sorted = [...items].sort((a, b) => b.likes - a.likes);
      const top = sorted.slice(0, 20);
      const rest = sorted.slice(20);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      if (!cancelled) setLiveVideos([...top, ...rest]);
    })();
    return () => { cancelled = true; };
  }, [vault]);

  const allVideos = [...liveVideos, ...MOCK_VIDEOS];
  const filteredVideos = allVideos.filter(v => {
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
            <VideoCard key={video.id} video={video} onCreatorClick={onCreatorClick} initiallyLiked={!!video.creatorId && myHearts.has(video.creatorId)} viewerId={viewerId} />
          ))
        ) : (
          countryFilter && countryFilter !== "GLOBAL" ? (
            <GhostCountryMessage countryCode={countryFilter} />
          ) : (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6 gap-3">
              <p className="text-sm font-bold text-foreground tracking-wider">NO CREATORS YET</p>
              <p className="text-xs text-muted-foreground max-w-xs">DTT just launched. Be one of the first creators to upload — your teasers will appear here.</p>
            </div>
          )
        )}
        <LegalFooter />
      </div>
    </div>
  );
};

export default DiscoveryFeed;