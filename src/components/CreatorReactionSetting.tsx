import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function CreatorReactionSetting({ onSaved }: { onSaved: () => void }) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    setError("");
    const result = await supabase.rpc("my_reaction_setting");
    if (result.error) { setError("Couldn’t load your reaction setting."); return; }
    setEnabled(result.data === true);
    setReady(true);
  };
  useEffect(() => { void load(); }, []);
  const save = async (value: boolean) => {
    setBusy(true);
    setError("");
    const result = await supabase.rpc("set_my_reaction_setting", { _enabled: value });
    setBusy(false);
    if (result.error) { setError("Setting not saved. Please retry."); return; }
    setEnabled(result.data === true);
    onSaved();
  };
  return <div className="space-y-2 border-b border-border pb-4">
    <label className="flex items-center justify-between gap-4 text-sm font-semibold text-foreground">
      Private emoji reactions
      <Switch aria-label="Allow private emoji reactions" checked={enabled} disabled={!ready || busy} onCheckedChange={value => void save(value)} />
    </label>
    {error && <p role="alert" className="text-xs text-destructive">{error} {!ready && <Button variant="ghost" size="sm" onClick={() => void load()}>Retry</Button>}</p>}
  </div>;
}