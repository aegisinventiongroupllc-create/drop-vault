import { useState } from "react";
import { Search, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nContext";
import { MOCK_VIDEOS, type VideoItem } from "@/components/DiscoveryFeed";

interface SearchResult {
  name: string;
  category: string;
  verified: boolean;
}

const ALL_CREATORS: SearchResult[] = [
  { name: "LunaCosplay", category: "Cosplay", verified: true },
  { name: "FitJessie", category: "Gym", verified: true },
  { name: "BlondieVibes", category: "Lifestyle", verified: false },
  { name: "TwinFlames", category: "Groups", verified: true },
  { name: "PetiteSophie", category: "Fashion", verified: false },
  { name: "NeonQueen", category: "Cosplay", verified: true },
  { name: "GymRat_Anna", category: "Gym", verified: false },
  { name: "DuoVibes", category: "Groups", verified: false },
];

const GlobalSearch = ({ onCreatorClick, onClose }: { onCreatorClick: (name: string) => void; onClose: () => void }) => {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [demandSent, setDemandSent] = useState(false);

  const q = query.trim().toLowerCase();

  // Search creators
  const creatorResults = q
    ? ALL_CREATORS.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      )
    : [];

  // Search video titles (niche discovery)
  const videoResults = q
    ? MOCK_VIDEOS.filter(v =>
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
      )
    : [];

  // Deduplicate creators from video results
  const videoCreators = new Set(creatorResults.map(c => c.name));
  const uniqueVideoResults = videoResults.filter(v => !videoCreators.has(v.creator));

  const noResults = q.length > 0 && creatorResults.length === 0 && videoResults.length === 0;

  const handleRequestDemand = async () => {
    if (!query.trim() || demandSent) return;
    const prefs = localStorage.getItem("dtt_user_prefs");
    const email = prefs ? JSON.parse(prefs).email : null;
    await supabase.from("market_demand").insert({
      keyword: query.trim().toLowerCase(),
      user_email: email,
    });
    setDemandSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground active:scale-95 transition-all">
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setDemandSent(false); }}
            placeholder={t.search_placeholder}
            className="w-full bg-secondary rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="px-4 mt-2 space-y-2 max-h-[calc(100vh-80px)] overflow-y-auto">
        {/* Creator results */}
        {creatorResults.map((creator) => (
          <button
            key={creator.name}
            onClick={() => { onCreatorClick(creator.name); onClose(); }}
            className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-primary/50 active:bg-card/80 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-primary">
              {creator.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-foreground">@{creator.name}</p>
                {creator.verified && (
                  <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full px-1.5 py-0.5 font-bold">✓</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{creator.category}</p>
            </div>
            <Button variant="neon" size="sm" className="text-[10px]">
              {t.unlock}
            </Button>
          </button>
        ))}

        {/* Video title matches (Niche Discovery) */}
        {uniqueVideoResults.length > 0 && (
          <>
            {creatorResults.length > 0 && (
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground pt-2">MATCHING TEASERS</p>
            )}
            {uniqueVideoResults.map((video) => (
              <button
                key={video.id}
                onClick={() => { onCreatorClick(video.creator); onClose(); }}
                className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-primary/50 active:bg-card/80 transition-all"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${video.color} flex items-center justify-center text-xs font-bold text-foreground`}>
                  ▶
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground text-sm">{video.title}</p>
                  <p className="text-xs text-muted-foreground">@{video.creator}</p>
                </div>
              </button>
            ))}
          </>
        )}

        {noResults && (
          <div className="text-center py-8 space-y-3">
            <Lightbulb className="w-8 h-8 text-gold mx-auto" />
            <p className="text-sm text-muted-foreground">
              {t.niche_not_found} <span className="text-foreground font-semibold">{t.request_niche}?</span>
            </p>
            <p className="text-xs text-muted-foreground">
              "<span className="text-primary font-medium">{query}</span>"
            </p>
            {demandSent ? (
              <p className="text-xs text-green-400 font-bold tracking-wider">{t.request_logged}</p>
            ) : (
              <Button variant="neon" size="sm" onClick={handleRequestDemand}>
                {t.request_niche}
              </Button>
            )}
          </div>
        )}

        {!query.trim() && (
          <p className="text-center text-sm text-muted-foreground py-8">{t.start_typing}</p>
        )}
      </div>
    </div>
  );
};

export default GlobalSearch;