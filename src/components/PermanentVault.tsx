import ProtectedVideo from "@/components/ProtectedVideo";
import ContentEmojiReactions from "@/components/ContentEmojiReactions";
import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { allowedVaults, type CustomerPreference } from "@/lib/customerPreference";
import { isCreatorCategory } from "@/lib/creatorCategories";

type Item = { id: string; creator_id: string; title: string; media_type: string; creator_name: string | null; purchased_at: string; url: string | null };

/** Customer's permanently purchased videos; access survives library rotation. */
export default function PermanentVault({ preference }: { preference?: CustomerPreference }) {
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
      const rows: Item[] = data?.items ?? [];
      const ids = Array.from(new Set(rows.map(item => item.creator_id)));
      const { data: profiles, error: profileError } = ids.length ? await supabase.from("public_profiles").select("user_id, vault_side").in("user_id", ids) : { data: [], error: null };
      if (cancel) return;
      const visible = new Set((profiles ?? []).filter(profile => isCreatorCategory(profile.vault_side) && allowedVaults(preference).includes(profile.vault_side)).map(profile => profile.user_id));
      const filtered = rows.filter(item => visible.has(item.creator_id));
      setLoading(false);
      if (error || profileError || !data?.items) { setError("Your permanent vault is unavailable right now."); return; }
      setError(""); setMore(!!data.has_more);
      setItems((prev) => (offset === 0 ? filtered : [...prev.filter((p) => !filtered.some(i => i.id === p.id)), ...filtered]));
      // Refresh links before they expire.
      timer = setTimeout(() => { if (offset === 0) void load(); else { setItems([]); setOffset(0); } }, Math.max(30, (Number(data.link_seconds) || 300) - 30) * 1000);
    };
    void load();
    return () => { cancel = true; clearTimeout(timer); };
  }, [offset, preference]);
  useEffect(() => { setItems([]); setOffset(0); }, [preference]);

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
                  : v.url ? <ProtectedVideo src={v.url} className="w-full aspect-video object-cover bg-background" controls playsInline preload="none" />
                  : <div className="w-full aspect-video bg-secondary flex items-center justify-center"><Lock className="w-4 h-4 text-muted-foreground" /></div>}
                <p className="text-xs font-semibold text-foreground px-2 pt-2 truncate">{v.title}</p>
                <p className="text-[10px] text-muted-foreground px-2 pb-2 truncate">{v.creator_name ? `@${v.creator_name}` : ""}</p>
                {v.url && <ContentEmojiReactions mediaId={v.id} />}
              </div>
            ))}
          </div>
        )}
      {more && <Button variant="outline" disabled={loading} onClick={() => setOffset((n) => n + 24)}>{loading ? "Loading…" : "More videos"}</Button>}
    </div>
  );
}
