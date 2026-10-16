import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SEEN_KEY = (id: string) => `dtt_top_fans_seen_${id}`;

interface Fan { rank: number; fan_id: string; display_name: string | null }
interface MediaStat { id: string; title: string; comments: number }

const CreatorFanInsights = ({ creatorId }: { creatorId: string | null }) => {
  const [newFans, setNewFans] = useState<Fan[]>([]);
  const [stats, setStats] = useState<MediaStat[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!creatorId) return;
    let cancel = false;
    (async () => {
      const { data: fans } = await supabase.rpc("get_top_fans", { _creator_id: creatorId });
      if (!cancel && fans) {
        const list = fans as Fan[];
        let seen: string[] = [];
        try { seen = JSON.parse(localStorage.getItem(SEEN_KEY(creatorId)) || "[]"); } catch { /* ignore */ }
        const hadHistory = localStorage.getItem(SEEN_KEY(creatorId)) !== null;
        setNewFans(hadHistory ? list.filter((f) => !seen.includes(f.fan_id)) : []);
        localStorage.setItem(SEEN_KEY(creatorId), JSON.stringify(list.map((f) => f.fan_id)));
      }
      const [{ data: comments }, { data: media }] = await Promise.all([
        supabase.from("creator_comments").select("media_id").eq("creator_id", creatorId),
        supabase.from("creator_media").select("id, title").eq("creator_id", creatorId),
      ]);
      if (cancel) return;
      const counts: Record<string, number> = {};
      (comments || []).forEach((c) => { if (c.media_id) counts[c.media_id] = (counts[c.media_id] || 0) + 1; });
      setTotal(comments?.length || 0);
      setStats(
        (media || [])
          .map((m) => ({ id: m.id, title: m.title, comments: counts[m.id] || 0 }))
          .filter((m) => m.comments > 0)
          .sort((a, b) => b.comments - a.comments)
          .slice(0, 5),
      );
    })();
    return () => { cancel = true; };
  }, [creatorId]);

  return (
    <div className="space-y-3">
      {newFans.length > 0 && (
        <div className="bg-gold/10 border border-gold/30 rounded-xl p-3 relative">
          <button onClick={() => setNewFans([])} className="absolute top-2 right-2 text-muted-foreground text-xs">✕</button>
          <p className="text-xs font-bold tracking-wider text-gold uppercase mb-1">New in your top 10</p>
          {newFans.map((f) => (
            <p key={f.fan_id} className="text-xs text-foreground">#{f.rank} @{f.display_name || "fan"}</p>
          ))}
        </div>
      )}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2">Top comment stats · {total} total</p>
        {stats.length === 0 ? (
          <p className="text-xs text-muted-foreground">No comments yet.</p>
        ) : stats.map((s, i) => (
          <div key={s.id} className="flex justify-between text-xs py-1">
            <span className="text-foreground truncate">{i + 1}. {s.title}</span>
            <span className="text-primary font-bold">{s.comments}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreatorFanInsights;
