import { useEffect, useState } from "react";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import ProfileAvatar, {
  AVATAR_EARS, AVATAR_EYEBROWS, AVATAR_FACIAL_HAIR, AVATAR_GLASSES, AVATAR_HAIR,
  AVATAR_HAIR_COLORS, AVATAR_JAWLINES, AVATAR_SKIN_TONES, DEFAULT_AVATAR,
  parseAvatarConfig, type AvatarConfig,
} from "@/components/ProfileAvatar";

const HANDLE_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_.]{2,23}$/;
type LayerKey = "skinTone" | "hair" | "hairColor" | "eyebrows" | "ears" | "jawline" | "facialHair" | "glasses";

const LAYERS: Array<{ key: LayerKey; label: string; values: readonly string[] }> = [
  { key: "skinTone", label: "Skin tone", values: AVATAR_SKIN_TONES },
  { key: "hair", label: "Hair", values: AVATAR_HAIR },
  { key: "hairColor", label: "Hair color", values: AVATAR_HAIR_COLORS },
  { key: "eyebrows", label: "Eyebrows", values: AVATAR_EYEBROWS },
  { key: "ears", label: "Ears", values: AVATAR_EARS },
  { key: "jawline", label: "Chin / jawline", values: AVATAR_JAWLINES },
  { key: "facialHair", label: "Facial hair", values: AVATAR_FACIAL_HAIR },
  { key: "glasses", label: "Glasses", values: AVATAR_GLASSES },
];

const pretty = (value: string) => value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());

const ProfileIdentityEditor = ({ compact = false, onSaved }: { compact?: boolean; onSaved?: (handle: string, avatar: AvatarConfig) => void }) => {
  const [handle, setHandle] = useState("");
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from("profiles").select("display_name, avatar_config").eq("user_id", user.id).maybeSingle();
      if (data) {
        setHandle(data.display_name ?? "");
        setAvatar(parseAvatarConfig(data.avatar_config));
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    const clean = handle.trim().replace(/^@/, "");
    if (!HANDLE_PATTERN.test(clean)) {
      toast({ title: "Choose a valid handle", description: "Use 3–24 letters, numbers, underscores, or periods.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = user
      ? await supabase.from("profiles").update({ display_name: clean, avatar_config: avatar as unknown as Json }).eq("user_id", user.id)
      : { error: new Error("Please sign in again.") };
    setSaving(false);
    if (error) {
      const duplicate = "code" in error && error.code === "23505";
      toast({ title: duplicate ? "Handle already taken" : "Couldn't save profile", description: duplicate ? "Try another handle." : error.message, variant: "destructive" });
      return;
    }
    setHandle(clean);
    onSaved?.(clean, avatar);
    window.dispatchEvent(new Event("dtt-profile-changed"));
    toast({ title: "Character saved", description: `Your new look is live as @${clean}.` });
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-primary" />;

  return (
    <section className={compact ? "space-y-5" : "w-full max-w-md space-y-5"}>
      <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-border bg-background/95 py-3 backdrop-blur">
        <ProfileAvatar config={avatar} className="h-24 w-24 border-primary neon-glow" label={handle || "Your"} />
        <div className="min-w-0 flex-1 text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Live preview</p>
          <p className="truncate text-lg font-bold text-foreground">@{handle || "your_handle"}</p>
          <p className="text-xs text-muted-foreground">Your email always stays private.</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => setAvatar(DEFAULT_AVATAR)} title="Reset character" aria-label="Reset character">
          <RotateCcw />
        </Button>
      </div>

      <div className="text-left">
        <label htmlFor="display-handle" className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Display name / gaming handle</label>
        <Input id="display-handle" value={handle} maxLength={24} autoComplete="nickname" placeholder="neon_player" onChange={(event) => setHandle(event.target.value.replace(/[^A-Za-z0-9_.]/g, ""))} />
      </div>

      <div className="space-y-4 text-left">
        {LAYERS.map((layer) => (
          <div key={layer.key}>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{layer.label}</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {layer.values.map((value) => {
                const selected = avatar[layer.key] === value;
                return (
                  <Button
                    key={value}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    size="sm"
                    className="shrink-0"
                    aria-pressed={selected}
                    onClick={() => setAvatar((current) => ({ ...current, [layer.key]: value }))}
                  >
                    {pretty(value)}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Button variant="neon" className="w-full" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
        SAVE CHARACTER
      </Button>
    </section>
  );
};

export default ProfileIdentityEditor;