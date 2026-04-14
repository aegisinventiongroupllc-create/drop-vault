import { useState } from "react";
import { Search, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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
  const [query, setQuery] = useState("");

  const results = query.trim()
    ? ALL_CREATORS.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search creators by name or category..."
            className="w-full bg-secondary rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="px-4 mt-2 space-y-2 max-h-[calc(100vh-80px)] overflow-y-auto">
        {results.map((creator) => (
          <button
            key={creator.name}
            onClick={() => { onCreatorClick(creator.name); onClose(); }}
            className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all"
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
              UNLOCK
            </Button>
          </button>
        ))}
        {query.trim() && results.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No creators found for "{query}"</p>
        )}
        {!query.trim() && (
          <p className="text-center text-sm text-muted-foreground py-8">Start typing to discover creators</p>
        )}
      </div>
    </div>
  );
};

export default GlobalSearch;
