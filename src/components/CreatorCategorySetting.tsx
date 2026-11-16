import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, CREATOR_CATEGORIES, isCreatorCategory, type CreatorCategory } from "@/lib/creatorCategories";
import ContentLabelingNotice from "./ContentLabelingNotice";

export default function CreatorCategorySetting() {
  const [category, setCategory] = useState<CreatorCategory | "">("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) { setMessage("Please sign in again."); setBusy(false); } return; }
      const { data, error } = await supabase.from("profiles").select("vault_side").eq("user_id", user.id).maybeSingle();
      if (active) { if (isCreatorCategory(data?.vault_side)) setCategory(data.vault_side); setMessage(error ? "Couldn’t load your category." : ""); setBusy(false); }
    })();
    return () => { active = false; };
  }, []);
  const save = async () => {
    if (!isCreatorCategory(category)) return;
    setBusy(true); setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); setMessage("Please sign in again."); return; }
    const { data, error } = await supabase.from("profiles").update({ vault_side: category }).eq("user_id", user.id).select("vault_side").single();
    setBusy(false); setMessage(error || data?.vault_side !== category ? "Couldn’t save your category. Please retry." : "Category saved.");
  };
  return <section className="space-y-3 text-left">
    <label htmlFor="creator-category" className="text-xs font-semibold text-foreground">Creator category</label>
    <select id="creator-category" value={category} disabled={busy} onChange={event => { if (isCreatorCategory(event.target.value)) setCategory(event.target.value); setMessage(""); }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
      <option value="" disabled>Select category</option>
      {CREATOR_CATEGORIES.map(value => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}
    </select>
    <ContentLabelingNotice />
    <Button variant="outline" disabled={busy || !category} onClick={() => void save()}>SAVE CATEGORY</Button>
    {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
  </section>;
}