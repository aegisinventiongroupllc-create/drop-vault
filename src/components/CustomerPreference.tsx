import { Button } from "@/components/ui/button";
import LegalFooter from "@/components/LegalFooter";
import { useState } from "react";
import { allowedVaults, type CustomerPreference as Preference } from "@/lib/customerPreference";

import ContentPreferenceChoices from "./ContentPreferenceChoices";
import type { CreatorCategory } from "@/lib/creatorCategories";

export type GenderPreference = Preference;

interface CustomerPreferenceProps {
  onSelect: (pref: CreatorCategory[]) => Promise<void>;
  initial?: Preference | null;
  onCancel?: () => void;
}

const CustomerPreference = ({ onSelect, initial, onCancel }: CustomerPreferenceProps) => {
  const [selected, setSelected] = useState<CreatorCategory[]>(initial == null ? [] : allowedVaults(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="flex min-h-full flex-col">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-8 px-6 py-12 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wider text-foreground mb-1">
            <span className="notranslate" translate="no">DROPTHAT<span className="text-primary">THING™</span></span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2">Who are you looking for?</p>
        </div>

        <div className="w-full space-y-6 text-left">
          <ContentPreferenceChoices value={selected} onChange={setSelected} disabled={busy} />
          {!selected.length && <p className="text-xs text-muted-foreground">No categories selected. Your feed will stay empty.</p>}
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          <Button variant="neon" disabled={busy} className="w-full" onClick={async () => { setBusy(true); setError(""); try { await onSelect(selected); } catch { setError("Couldn’t save preferences. Please retry."); } finally { setBusy(false); } }}>SAVE PREFERENCES</Button>
          {onCancel && <Button variant="ghost" className="w-full" onClick={onCancel}>CANCEL</Button>}
        </div>

      </div>
      <LegalFooter />
      </div>
    </div>
  );
};

export default CustomerPreference;
