import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ProfileAvatar, {
  AVATAR_ACCENTS,
  AVATAR_FACES,
  AVATAR_TONES,
  DEFAULT_AVATAR,
  parseAvatarConfig,
  type AvatarConfig,
} from "@/components/ProfileAvatar";

const HANDLE_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_.]{2,23}$/;

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
      ? await supabase.from("profiles").update({ display_name: clean, avatar_config: avatar }).eq("user_id", user.id)
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
    toast({ title: "Profile saved", description: `You appear publicly as @${clean}.` });
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-primary" />;

  return (
    <section className={compact ? "space-y-4" : "w-full max-w-sm space-y-5"}>
      <div className="flex items-center gap-4">
        <ProfileAvatar config={avatar} className="h-20 w-20" label={handle || "Your"} />
        <div className="min-w-0 text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Public identity</p>
          <p className="truncate text-lg font-bold text-foreground">@{handle || "your_handle"}</p>
          <p className="text-xs text-muted-foreground">Your email always stays private.</p>
        </div>
      </div>

      <div className="text-left">
        <label htmlFor="display-handle" className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Display name / gaming handle</label>
        <Input id="display-handle" value={handle} maxLength={24} autoComplete="nickname" placeholder="neon_player" onChange={(e) => setHandle(e.target.value.replace(/[^A-Za-z0-9_.]/g, ""))} />
      </div>

      <div className="space-y-3 text-left">
        <AvatarChoice label="ICON" values={AVATAR_FACES} selected={avatar.face} onSelect={(face) => setAvatar((current) => ({ ...current, face }))} preview={(face) => ({ ...avatar, face })} />
        <AvatarChoice label="COLOR" values={AVATAR_TONES} selected={avatar.tone} onSelect={(tone) => setAvatar((current) => ({ ...current, tone }))} preview={(tone) => ({ ...avatar, tone })} />
        <AvatarChoice label="ACCENT" values={AVATAR_ACCENTS} selected={avatar.accent} onSelect={(accent) => setAvatar((current) => ({ ...current, accent }))} preview={(accent) => ({ ...avatar, accent })} />
      </div>

      <Button variant="neon" className="w-full" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
        SAVE PUBLIC PROFILE
      </Button>
    </section>
  );
};

const AvatarChoice = <T extends string>({ label, values, selected, onSelect, preview }: { label: string; values: readonly T[]; selected: T; onSelect: (value: T) => void; preview: (value: T) => AvatarConfig }) => (
  <div>
    <p className="mb-2 text-[10px] font-bold tracking-widest text-muted-foreground">{label}</p>
    <div className="grid grid-cols-6 gap-2">
      {values.map((value) => (
        <button key={value} type="button" onClick={() => onSelect(value)} aria-label={`${label.toLowerCase()} ${value}`} aria-pressed={selected === value} className={`flex aspect-square items-center justify-center rounded-full border transition-transform active:scale-95 ${selected === value ? "border-primary bg-primary/10" : "border-border bg-secondary"}`}>
          <ProfileAvatar config={preview(value)} className="h-8 w-8" />
        </button>
      ))}
    </div>
  </div>
);

export default ProfileIdentityEditor;