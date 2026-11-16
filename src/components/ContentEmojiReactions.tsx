import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const CONTENT_EMOJIS = [
  { emoji: "❤️", label: "Love" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "😍", label: "Adore" },
  { emoji: "👏", label: "Applause" },
  { emoji: "✨", label: "Sparkle" },
] as const;
type State = { enabled?: boolean; allowed?: boolean; owner?: boolean; selected?: string | null; counts?: Record<string, number> };

export default function ContentEmojiReactions({ mediaId, revision = 0 }: { mediaId: string; revision?: number }) {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setState(null);
    setError("");
    const load = async () => {
      const result = await supabase.rpc("content_reaction_state", { _media_id: mediaId });
      if (cancelled) return;
      if (result.error) { setError("Reactions unavailable."); return; }
      setError("");
      setState(result.data as State);
    };
    void load();
    const timer = setInterval(() => { if (!document.hidden) void load(); }, 30000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [mediaId, revision]);

  const react = async (emoji: string) => {
    if (busy || !state?.allowed) return;
    setBusy(true);
    setError("");
    const { data, error } = await supabase.rpc("set_content_reaction", { _media_id: mediaId, _emoji: state.selected === emoji ? null : emoji });
    setBusy(false);
    if (error) { setError("Reaction not saved. Check access and try again."); return; }
    setState(data as State);
  };
  if (!state?.owner && !state?.allowed) return error ? <p role="alert" className="px-2 text-xs text-destructive">{error}</p> : null;
  if (state.owner) return <div className="flex flex-wrap gap-2 py-2" aria-label="Private reaction totals">
    {CONTENT_EMOJIS.map(({ emoji, label }) => <span key={emoji} title={label} className="text-sm text-muted-foreground">{emoji} {state.counts?.[emoji] ?? 0}</span>)}
  </div>;
  return <div className="px-2 pb-2 space-y-1">
    <p className="text-[10px] text-muted-foreground">Private reaction</p>
    <div className="flex flex-wrap gap-1" aria-label="Private emoji reactions">
      {CONTENT_EMOJIS.map(({ emoji, label }) => <Button key={emoji} variant={state.selected === emoji ? "secondary" : "ghost"} size="icon" className="h-8 w-8 shrink-0 text-lg" aria-label={label} title={label} aria-pressed={state.selected === emoji} disabled={busy} onClick={() => void react(emoji)}>{emoji}</Button>)}
    </div>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}