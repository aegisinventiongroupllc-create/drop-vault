import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ContentPreferenceChoices from "./ContentPreferenceChoices";
import type { CreatorCategory } from "@/lib/creatorCategories";
export default function ContentFilterMenu({ value, onChange }: { value: CreatorCategory[]; onChange: (categories: CreatorCategory[]) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const change = async (categories: CreatorCategory[]) => { setBusy(true); setError(""); try { await onChange(categories); } catch { setError("Couldn’t save filters. Please retry."); } finally { setBusy(false); } };
  return <Popover><PopoverTrigger asChild><Button variant="secondary" size="sm" className="text-xs font-bold">FILTERS · {value.length}</Button></PopoverTrigger>
    <PopoverContent align="start" className="w-64 max-w-[calc(100vw-2rem)] space-y-3"><ContentPreferenceChoices value={value} onChange={categories => void change(categories)} disabled={busy} />
      {!value.length && <p className="text-xs text-muted-foreground">No categories selected.</p>}{error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </PopoverContent></Popover>;
}