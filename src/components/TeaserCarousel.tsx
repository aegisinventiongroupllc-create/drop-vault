import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CreatorMediaItem } from "@/hooks/useCreatorMedia";
import TeaserViewport, { type TeaserFrame } from "@/components/TeaserViewport";

const FRAMES: { value: TeaserFrame; label: string }[] = [{ value: "none", label: "None" }, { value: "seasonal", label: "Holiday / Seasonal" }, { value: "sexy", label: "Sexy" }, { value: "gothic", label: "Gothic" }, { value: "glamour", label: "Glamour" }];
export default function TeaserCarousel({ items, onRefresh, onDelete }: { items: CreatorMediaItem[]; onRefresh: () => Promise<void>; onDelete: (id: string, bucket: "teasers" | "vault", path: string) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<CreatorMediaItem | null>(null);
  const [editing, setEditing] = useState(false);
  const [frame, setFrame] = useState<TeaserFrame>("none");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!items.length) return;
      const { data } = await supabase.storage.from("teasers").createSignedUrls(items.map((item) => item.storage_path), 3600);
      const map: Record<string, string> = {};
      data?.forEach((row) => { if (row.path && row.signedUrl) map[row.path] = row.signedUrl; });
      if (!cancelled) setUrls(map);
    };
    void load();
    return () => { cancelled = true; };
  }, [items]);
  const activate = async (item: CreatorMediaItem, period: "day" | "month") => {
    setBusy(true);
    const { error } = await supabase.rpc("set_my_active_teaser", { _media_id: item.id, _period: period });
    if (error) toast.error("Couldn't set active teaser"); else { await onRefresh(); toast.success("Active teaser saved", { duration: 4000 }); }
    setBusy(false);
  };
  const open = (item: CreatorMediaItem, edit: boolean) => { setSelected(item); setFrame(item.teaser_frame); setTitle(item.title); setEditing(edit); };
  return <section className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-base font-semibold text-foreground">Your Teasers ({items.length})</h3>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" aria-label="Previous teaser" title="Previous teaser" onClick={() => track.current?.scrollBy({ left: -250, behavior: "smooth" })}><ChevronLeft className="h-5 w-5" /></Button>
        <Button variant="ghost" size="icon" aria-label="Next teaser" title="Next teaser" onClick={() => track.current?.scrollBy({ left: 250, behavior: "smooth" })}><ChevronRight className="h-5 w-5" /></Button>
      </div>
    </div>
    {!items.length ? <p className="text-xs text-muted-foreground py-4">No teasers yet.</p> : <div ref={track} className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3">
      {items.map((item) => {
        const active = !!item.active_until && new Date(item.active_until).getTime() > Date.now();
        const url = urls[item.storage_path];
        return <article key={item.id} className="w-60 shrink-0 snap-start border border-border rounded-lg overflow-hidden bg-card">
          <Button variant="ghost" aria-label={`Preview ${item.title}`} className={`relative w-full h-56 p-0 teaser-viewport teaser-frame-${item.teaser_frame}`} disabled={!url} onClick={() => open(item, false)}>
            {url && (item.media_type === "photo" ? <img src={url} alt={item.title} className="h-full w-full object-cover" /> : <video src={url} muted playsInline preload="metadata" className="h-full w-full object-cover" />)}
            <span className="absolute inset-0 flex items-center justify-center bg-background/20"><Play className="h-8 w-8 text-foreground" /></span>
            <span className="teaser-decoration absolute inset-0 pointer-events-none" />
          </Button>
          <div className="p-3 space-y-2">
            <p className="text-sm font-semibold truncate text-foreground">{item.title}</p>
            {active && <p className="text-xs text-primary">ACTIVE · {new Date(item.active_until || "").toLocaleDateString()}</p>}
            <div className="flex gap-1"><Button size="sm" variant="neon" disabled={busy} onClick={() => activate(item, "day")}>DAY</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => activate(item, "month")}>MONTH</Button></div>
            <div className="flex justify-between gap-1"><Button variant="ghost" size="sm" onClick={() => open(item, true)}>EDIT TEASER</Button><Button variant="ghost" size="icon" aria-label={`Delete ${item.title}`} title="Delete teaser" onClick={() => onDelete(item.id, item.bucket, item.storage_path)}><X className="h-4 w-4" /></Button></div>
          </div>
        </article>;
      })}
    </div>}
    <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
      <DialogContent className="max-w-sm max-h-[90dvh] overflow-y-auto">
        <DialogTitle>{editing ? "Edit Teaser" : selected?.title}</DialogTitle>
        {selected && urls[selected.storage_path] && <TeaserViewport key={selected.id} url={urls[selected.storage_path]} type={selected.media_type} frame={frame} />}
        {editing && selected && <div className="space-y-3">
          <input aria-label="Teaser title" value={title} onChange={(event) => setTitle(event.target.value)} className="w-full bg-secondary text-foreground border border-border rounded-md p-2" />
          <label className="block text-sm text-muted-foreground">Picture frame<select aria-label="Picture frame" value={frame} onChange={(event) => setFrame(event.target.value as TeaserFrame)} className="w-full bg-secondary text-foreground border border-border rounded-md p-2 mt-1">{FRAMES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <Button variant="neon" disabled={busy} onClick={async () => {
            setBusy(true);
            const { error } = await supabase.from("creator_media").update({ title: title.trim() || "Untitled", teaser_frame: frame }).eq("id", selected.id).eq("creator_id", selected.creator_id);
            if (error) toast.error("Couldn't save teaser"); else { await onRefresh(); setSelected(null); toast.success("Teaser saved", { duration: 4000 }); }
            setBusy(false);
          }}>SAVE TEASER</Button>
        </div>}
      </DialogContent>
    </Dialog>
  </section>;
}