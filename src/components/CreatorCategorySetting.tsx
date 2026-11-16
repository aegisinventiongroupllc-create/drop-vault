import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, CREATOR_CATEGORIES, isCreatorCategory, type CreatorCategory } from "@/lib/creatorCategories";
import ContentLabelChoices from "./ContentLabelChoices";
import { validContentLabels } from "@/lib/contentLabels";
import ContentLabelingNotice from "./ContentLabelingNotice";
import AdaptiveTagChoices from "./AdaptiveTagChoices";
import { parseAdaptiveTags, type AdaptiveTag } from "@/lib/adaptiveTags";

export default function CreatorCategorySetting() {
  const [category, setCategory] = useState<CreatorCategory | "">("");
  const [labels, setLabels] = useState<string[]>([]);
  const [adaptiveTags, setAdaptiveTags] = useState<AdaptiveTag[]>([]);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) { setMessage("Please sign in again."); setBusy(false); } return; }
      const { data, error } = await supabase.from("profiles").select("vault_side, content_labels, adaptive_tags").eq("user_id", user.id).maybeSingle();
      if (active) { if (isCreatorCategory(data?.vault_side)) setCategory(data.vault_side); setLabels(data?.content_labels ?? []); setAdaptiveTags(parseAdaptiveTags(data?.adaptive_tags)); setMessage(error ? "Couldn’t load your category." : ""); setBusy(false); }
    })();
    return () => { active = false; };
  }, []);
  const save = async () => {
    if (!isCreatorCategory(category) || !validContentLabels(labels)) return;
    setBusy(true); setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); setMessage("Please sign in again."); return; }
    const { error } = await supabase.rpc("save_my_creator_discovery", { _category: category, _labels: labels });
    if (error) { setBusy(false); setMessage("Couldn’t save your category and labels. Please retry."); return; }
    const { error: adaptiveError } = await supabase.rpc("save_my_adaptive_tags", { _tags: adaptiveTags });
    setBusy(false); setMessage(adaptiveError ? "Category saved, but adaptive tags couldn’t save. Please retry." : "Category and labels saved.");
  };
  return <section className="space-y-3 text-left">
    <label htmlFor="creator-category" className="text-xs font-semibold text-foreground">Creator category</label>
    <select id="creator-category" value={category} disabled={busy} onChange={event => { if (isCreatorCategory(event.target.value)) setCategory(event.target.value); setMessage(""); }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
      <option value="" disabled>Select category</option>
      {CREATOR_CATEGORIES.map(value => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}
    </select>
    <ContentLabelChoices value={labels} onChange={setLabels} disabled={busy} />
    <AdaptiveTagChoices value={adaptiveTags} onChange={setAdaptiveTags} disabled={busy} />
    <ContentLabelingNotice />
    <Button variant="outline" disabled={busy || !category || !validContentLabels(labels)} onClick={() => void save()}>SAVE CATEGORY</Button>
    {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
  </section>;
}