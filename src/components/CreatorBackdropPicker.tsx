import { useEffect, useState } from "react";
import { Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { creatorBackdropImage, parseCreatorBackdrop, searchCreatorBackdrops, type CreatorBackdropId } from "@/lib/creatorBackdrop";

export default function CreatorBackdropPicker() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CreatorBackdropId>();
  const [saved, setSaved] = useState<CreatorBackdropId>();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.from("profiles").select("avatar_config").eq("user_id", user.id).maybeSingle();
        if (!cancelled && !error) {
          const config = data?.avatar_config;
          const id = config && typeof config === "object" && !Array.isArray(config) ? parseCreatorBackdrop(config.creatorBackdrop) : undefined;
          setSelected(id); setSaved(id);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);
  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in again.");
      const { data, error: readError } = await supabase.from("profiles").select("avatar_config").eq("user_id", user.id).single();
      if (readError) throw readError;
      const previous = data.avatar_config;
      if (!previous || typeof previous !== "object" || Array.isArray(previous)) throw new Error("Profile unavailable.");
      const { data: updated, error } = await supabase.from("profiles").update({ avatar_config: { ...previous, creatorBackdrop: selected } }).eq("user_id", user.id).select("user_id").single();
      if (error || !updated) throw error ?? new Error("Backdrop was not saved.");
      setSaved(selected);
      window.dispatchEvent(new Event("dtt-profile-changed"));
      toast({ title: "Public backdrop saved" });
    } catch (error) {
      toast({ title: "Couldn't save backdrop", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally { setSaving(false); }
  };
  return <section className="space-y-3 border-t border-border py-4" aria-label="Public creator backdrop">
    <h3 className="font-semibold text-foreground">Public page backdrop</h3>
    <img src={creatorBackdropImage(selected)} alt="Selected public backdrop" className="h-32 w-full rounded-md object-cover" />
    <div className="relative">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden />
      <Input className="pl-9" aria-label="Search backdrop designs" placeholder="Search designs" value={query} onChange={(event) => setQuery(event.target.value)} />
    </div>
    <div className="grid grid-cols-2 gap-2">
      {searchCreatorBackdrops(query).map((item) => <Button key={item.id} variant="outline" aria-pressed={selected === item.id} disabled={loading || saving} onClick={() => setSelected(item.id)} className={`h-auto min-w-0 flex-col overflow-hidden p-0 ${selected === item.id ? "border-primary ring-1 ring-primary" : ""}`}>
        <img src={creatorBackdropImage(item.id)} alt="" className="h-16 w-full object-cover" loading="lazy" />
        <span className="w-full whitespace-normal p-2 text-xs">{item.label}</span>
      </Button>)}
    </div>
    {searchCreatorBackdrops(query).length === 0 && <p className="text-xs text-muted-foreground">No matching designs.</p>}
    <Button variant="outline" asChild className="w-full gap-2"><a href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${query.trim() || "galaxy"} background licensed images`)}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />Search Google Images</a></Button>
    <p className="text-xs text-muted-foreground">Google opens separately. Images are not imported; only use artwork you own or have permission to use.</p>
    <Button disabled={loading || saving || !selected || selected === saved} onClick={() => void save()} className="w-full">{saving ? "Saving…" : "Save public backdrop"}</Button>
  </section>;
}