import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function CreatorDebutBadge({ creatorId, editable = false }: { creatorId?: string | null; editable?: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [owner, setOwner] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    setEnabled(false); setBusy(true); setMessage("");
    void (async () => {
      const id = editable ? (await supabase.auth.getUser()).data.user?.id : creatorId;
      if (!id) { if (active) setBusy(false); return; }
      const { data, error } = await supabase.from("creator_debut_badges").select("first_platform").eq("user_id", id).maybeSingle();
      if (active) { setOwner(id); setEnabled(data?.first_platform === true); setBusy(false); if (error && editable) setMessage("Couldn’t load your badge. Please retry."); }
    })();
    return () => { active = false; };
  }, [creatorId, editable]);
  const save = async () => {
    if (!owner || busy) return;
    setBusy(true);
    const { error } = await supabase.from("creator_debut_badges").upsert({ user_id: owner, first_platform: enabled });
    setBusy(false); setMessage(error ? "Couldn’t save your badge. Please retry." : "Public badge saved.");
  };
  if (!editable) return enabled && !busy ? <span className="mt-2 inline-block max-w-full rounded-md border border-primary/60 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary" title="Self-declared by this creator; platform history is not independently verified.">MY FIRST CREATOR PLATFORM</span> : null;
  return <section className="space-y-3 border-t border-border pt-4">
    <div className="flex items-center justify-between gap-3"><label htmlFor="debut-badge" className="text-sm font-semibold text-foreground">My first creator platform</label><Switch id="debut-badge" checked={enabled} onCheckedChange={setEnabled} disabled={busy || !owner} /></div>
    <p className="text-xs text-muted-foreground">DTT is my first creator platform. Show this optional badge on my public profile. This is my own declaration, not a verified platform history.</p>
    {enabled && <p className="text-xs font-semibold text-primary">MY FIRST CREATOR PLATFORM</p>}
    <Button variant="outline" onClick={() => void save()} disabled={busy || !owner}>SAVE PUBLIC BADGE</Button>
    {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
  </section>;
}