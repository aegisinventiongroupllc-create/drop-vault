import { useEffect, useState } from "react";
import { Search, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nContext";
import ProfileAvatar from "@/components/ProfileAvatar";
import CreatorHeartButton from "@/components/CreatorHeartButton";
import type { VaultType } from "@/lib/tokenEconomy";
import { COUNTRIES } from "@/components/GlobalPassport";

interface CreatorRow {
  user_id: string;
  vault_side: VaultType;
  display_name: string | null;
  country: string | null;
  avatar_config: unknown;
  profile_photo_path: string | null;
  tags: string[] | null;
}

const countryFlag = (code: string | null) =>
  COUNTRIES.find((c) => c.code === code)?.flag ?? "🌍";

const GlobalSearch = ({ onCreatorClick, onClose, vault }: { vault?: VaultType; onCreatorClick: (name: string) => void; onClose: () => void }) => {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [demandSent, setDemandSent] = useState(false);
  const [creators, setCreators] = useState<CreatorRow[]>([]);

  const [offset,setOffset]=useState(0);
  const [hasMore,setHasMore]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const q=query.trim().toLowerCase();
  useEffect(()=>{setOffset(0);setCreators([]);},[q,vault]);
  useEffect(()=>{
    let cancelled=false;
    if(!q){setCreators([]);setLoading(false);return;}
    setLoading(true);
    const timer=setTimeout(()=>{
      const countries=COUNTRIES.filter(c=>c.name.toLowerCase().includes(q)||c.code.toLowerCase()===q).map(c=>c.code);
      void supabase.rpc("search_creator_page",{_query:q,_vault:vault??null,_countries:countries,_offset:offset}).then(({data,error})=>{
        if(cancelled)return;setLoading(false);setError(error?"Couldn’t load creators. Please try again.":"");
        if(!error&&data){setHasMore(data.length>24);const rows=data.slice(0,24) as unknown as CreatorRow[];setCreators(previous=>offset===0?rows:[...previous,...rows.filter(r=>!previous.some(p=>p.user_id===r.user_id))]);}
      });
    },300);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[q,vault,offset]);
  const creatorResults=creators;
  const noResults=q.length>0&&!loading&&!error&&creatorResults.length===0;

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
        {loading && <p className="text-sm text-muted-foreground">Loading creators…</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {/* Creator results */}
        {creatorResults.map((creator) => (
          <div
            key={creator.user_id}
            className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-primary/50 active:bg-card/80 transition-all"
          >
            <ProfileAvatar config={creator.avatar_config} creatorPhotoPath={creator.profile_photo_path} label={creator.display_name || "creator"} className="h-12 w-12" />
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold text-foreground truncate">
                {countryFlag(creator.country)} @{creator.display_name}
              </p>
              {(creator.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {(creator.tags ?? []).slice(0, 4).map((tag) => (
                    <span key={tag} className="text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full px-1.5 py-0.5 font-bold">{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <CreatorHeartButton creatorId={creator.user_id} />
            <Button variant="neon" size="sm" className="text-[10px] shrink-0" onClick={() => { if (creator.display_name) { onCreatorClick(creator.display_name); onClose(); } }}>
              {t.unlock}
            </Button>
          </div>
        ))}

        {hasMore && <Button variant="outline" disabled={loading} onClick={()=>setOffset(n=>n+24)}>More creators</Button>}
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