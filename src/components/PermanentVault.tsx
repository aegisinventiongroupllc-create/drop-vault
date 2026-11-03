import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Item = { id: string; title: string; media_type: string; creator_name: string | null; purchased_at: string; url: string | null };

/** Customer's permanently purchased videos; access survives library rotation. */
export default function PermanentVault() {
  const [items, setItems] = useState<Item[]>([]);
  const [offset, setOffset] = useState(0);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("permanent-vault", { body: { offset } });
      if (cancel) return;
      setLoading(false);
      if (error || !data?.items) { setError("Your permanent vault is unavailable right now."); return; }
      setError(""); setMore(!!data.has_more);
      setItems((prev) => (offset === 0 ? data.items : [...prev.filter((p) => !data.items.some((i: Item) => i.id === p.id)), ...data.items]));
      // Refresh links before they expire.
      timer = setTimeout(() => { if (offset === 0) void load(); else { setItems([]); setOffset(0); } }, 50 * 60000);
    };
    void load();
    return () => { cancel = true; clearTimeout(timer); };
  }, [offset]);

  return (
    <div className="px-4 space-y-3 flex-1">
      <p className="text-xs text-muted-foreground">Videos you saved permanently stay here, even after a creator's 14-day library rotates.</p>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p>
        : loading && items.length === 0 ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        : items.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">No permanent videos yet. Look for “Save to Permanent Vault” in a creator's library.</p>
        : (
          <div className="grid grid-cols-2 gap-2">
            {items.map((v) => (
              <div key={v.id} className="bg-card border border-border rounded-xl overflow-hidden">
                {v.url && v.media_type === "photo" ? <img src={v.url} alt={v.title} className="w-full aspect-video object-contain bg-background" />
                  : v.url ? <video src={v.url} className="w-full aspect-video object-cover bg-background" controls playsInline preload="none" />
                  : <div className="w-full aspect-video bg-secondary flex items-center justify-center"><Lock className="w-4 h-4 text-muted-foreground" /></div>}
                <p className="text-xs font-semibold text-foreground px-2 pt-2 truncate">{v.title}</p>
                <p className="text-[10px] text-muted-foreground px-2 pb-2 truncate">{v.creator_name ? `@${v.creator_name}` : ""}</p>
              </div>
            ))}
          </div>
        )}
      {more && <Button variant="outline" disabled={loading} onClick={() => setOffset((n) => n + 24)}>{loading ? "Loading…" : "More videos"}</Button>}
    </div>
  );
}
