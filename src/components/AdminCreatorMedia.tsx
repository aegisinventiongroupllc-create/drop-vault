import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type Item = { id: string; title: string; media_type: string; url: string | null; bucket: string };

/** Admin-only viewer: teasers signed under the admin storage policy, vault via the authorized vault-media function. */
export default function AdminCreatorMedia({ creatorId }: { creatorId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setError(null);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { setError("Sign in with your admin account to view creator media."); setLoading(false); return; }
      const out: Item[] = [];
      const { data: teasers } = await supabase.from("creator_media").select("id,title,media_type,storage_path")
        .eq("creator_id", creatorId).eq("bucket", "teasers").order("created_at", { ascending: false }).limit(24);
      for (const t of teasers ?? []) {
        const { data: s } = await supabase.storage.from("teasers").createSignedUrl(t.storage_path, 3600);
        out.push({ id: t.id, title: t.title, media_type: t.media_type, url: s?.signedUrl ?? null, bucket: "teasers" });
      }
      const { data: vault, error: vErr } = await supabase.functions.invoke("vault-media", { body: { creator_id: creatorId, offset: 0 } });
      if (vErr || (vault as any)?.error) setError("Vault videos need an admin account sign-in.");
      for (const v of (vault as any)?.items ?? []) out.push({ ...v, bucket: "vault" });
      if (!cancel) { setItems(out); setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [creatorId]);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-bold text-foreground mb-3">TEASERS & VAULT MEDIA</h3>
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : (
        <>
          {error && <p className="text-xs text-destructive mb-2">{error}</p>}
          {items.length === 0 ? <p className="text-xs text-muted-foreground">No media uploaded.</p> : (
            <div className="grid grid-cols-2 gap-2">
              {items.map((m) => (
                <div key={m.id} className="space-y-1">
                  {m.url ? (m.media_type === "video"
                    ? <video src={m.url} controls playsInline preload="metadata" className="w-full rounded-lg bg-secondary aspect-[3/4] object-cover" />
                    : <img src={m.url} alt={m.title} className="w-full rounded-lg aspect-[3/4] object-cover" />)
                    : <div className="aspect-[3/4] rounded-lg bg-secondary flex items-center justify-center text-[10px] text-muted-foreground">Unavailable</div>}
                  <p className="text-[10px] text-muted-foreground truncate">{m.bucket === "vault" ? "VAULT" : "TEASER"} · {m.title}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
