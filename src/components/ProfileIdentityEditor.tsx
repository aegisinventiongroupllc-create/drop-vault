import { useEffect, useRef, useState } from "react";
import { Camera, Check, Ear, Glasses, Loader2, RotateCcw, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { normalizeSelfie } from "@/lib/normalizeSelfie";
import { mapFaceLandmarks } from "@/lib/mapFaceLandmarks";
import { streamPortrait } from "@/lib/streamPortrait";
import { clearPortraitDraft, readPortraitDraft, savePortraitDraft } from "@/lib/avatarDraft";
import ProfileAvatar, {
  AVATAR_EARS, AVATAR_EYEBROWS, AVATAR_FACIAL_HAIR, AVATAR_GLASSES, AVATAR_HAIR,
  AVATAR_JAWLINES, AVATAR_SKIN_TONES, AVATAR_CLOTHING, DEFAULT_AVATAR,
  parseAvatarConfig, type AvatarConfig,
} from "@/components/ProfileAvatar";

const HANDLE_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_.]{2,23}$/;
type LayerKey = "skinTone" | "hair" | "hairColor" | "eyebrows" | "ears" | "jawline" | "facialHair" | "glasses";

const skinSwatches: Record<string, string> = {
  light: "bg-skin-light", warm: "bg-skin-warm", medium: "bg-skin-medium",
  deep: "bg-skin-deep", rich: "bg-skin-rich", dark: "bg-skin-dark",
};

const pretty = (value: string) => value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());

const HairIcon = ({ value }: { value: string }) => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    {value === "none" ? <><circle cx="24" cy="22" r="13" fill="currentColor"/><path d="M12 34Q24 41 36 34" fill="none" stroke="currentColor" strokeWidth="4"/></> :
      value === "crop" ? <path d="M10 26Q9 9 24 8q16 1 15 18l-6-7-5 4-6-6-5 6-7-3Z" fill="currentColor"/> :
      value === "waves" ? <path d="M7 33Q5 12 19 9q20-6 23 19-7-12-13-5-7-12-13 7Z" fill="currentColor"/> :
      value === "curls" ? <path d="M7 31Q2 22 10 18q-1-10 9-7 6-9 12-1 11-3 10 10 7 7 0 14-8-9-15-5-9-8-19 2Z" fill="currentColor"/> :
      value === "long" ? <path d="M8 42V25Q7 7 24 7t16 18v17l-9-4V21q-7-8-14 0v17Z" fill="currentColor"/> :
      <path d="m15 27 5-20 5 12 8-14v24q-9-5-18-2Z" fill="currentColor"/>}
  </svg>
);

const FacialHairIcon = ({ value }: { value: string }) => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    {value === "none" ? <path d="M12 24h24" stroke="currentColor" strokeWidth="3"/> :
      value === "stubble" ? <path d="M12 18q12 17 24 0-1 19-12 22Q13 37 12 18Z" fill="currentColor" opacity=".7"/> :
      value === "mustache" ? <path d="M24 24Q16 15 7 25q9 8 17 1 8 7 17-1-9-10-17-1Z" fill="currentColor"/> :
      value === "goatee" ? <><path d="M24 22Q16 16 10 24q7 6 14 1 7 5 14-1-6-8-14-2Z" fill="currentColor"/><path d="m18 29 6 13 6-13Z" fill="currentColor"/></> :
      <path d="M9 16q4 19 15 26 11-7 15-26-7 9-15 8-8 1-15-8Z" fill="currentColor"/>}
  </svg>
);

const BrowIcon = ({ value }: { value: string }) => (
  <svg viewBox="0 0 48 48" aria-hidden="true"><path d={value === "arched" ? "M8 28Q16 14 23 25M26 25Q34 14 41 28" : value === "straight" ? "M8 22h14M26 22h14" : value === "split" ? "M8 25l7-3m3-1 5 2m3 0 7-2m3 1 5 3" : "M8 26q8-7 15-1m3 0q8-6 15 1"} fill="none" stroke="currentColor" strokeWidth={value === "bold" ? 6 : 4} strokeLinecap="round"/></svg>
);

const JawIcon = ({ value }: { value: string }) => (
  <svg viewBox="0 0 48 48" aria-hidden="true"><path d={value === "square" || value === "strong" ? "M8 8v21l10 11h12l10-11V8" : value === "heart" ? "M8 8v17q3 11 16 17 13-6 16-17V8" : value === "tapered" ? "M8 8v16q4 12 16 20 12-8 16-20V8" : "M8 8v18q4 14 16 16 12-2 16-16V8"} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
);

const SunglassesIcon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 16h38M8 18h14v5q0 9-7 9t-7-9Zm18 0h14v5q0 9-7 9t-7-9Zm-4 3h4" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
);

const DRAFT_KEY = "dtt_avatar_draft";

const readDraft = (): { handle?: string; avatar?: AvatarConfig } | null => {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { handle: typeof parsed.handle === "string" ? parsed.handle : undefined, avatar: parsed.avatar ? parseAvatarConfig(parsed.avatar) : undefined };
  } catch {
    return null;
  }
};

const ProfileIdentityEditor = ({ compact = false, onSaved }: { compact?: boolean; onSaved?: (handle: string, avatar: AvatarConfig) => void }) => {
  const [handle, setHandle] = useState("");
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [portraitPreview, setPortraitPreview] = useState<string>();
  const [portraitBlob, setPortraitBlob] = useState<Blob>();
  const [photoStage, setPhotoStage] = useState("");
  const cameraInput = useRef<HTMLInputElement>(null);
  const dirty = useRef(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from("profiles").select("display_name, avatar_config").eq("user_id", user.id).maybeSingle();
      if (data) {
        setHandle(data.display_name ?? "");
        setAvatar(parseAvatarConfig(data.avatar_config));
      }
      // Unsaved edits (e.g. from before the camera opened) win over the stored profile.
      const draft = readDraft();
      if (draft?.handle !== undefined) setHandle(draft.handle);
      if (draft?.avatar) { setAvatar(draft.avatar); dirty.current = true; }
      try {
        const portrait = await readPortraitDraft();
        if (portrait) {
          setPortraitBlob(portrait);
          setPortraitPreview(URL.createObjectURL(portrait));
          dirty.current = true;
        }
      } catch { /* device storage may be disabled */ }
      setLoading(false);
    })();
  }, []);

  // Keep a draft of unsaved changes so nothing is lost if the screen reloads.
  useEffect(() => {
    if (loading || !dirty.current) return;
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ handle, avatar })); } catch { /* storage full */ }
  }, [handle, avatar, loading]);

  const updateAvatar: typeof setAvatar = (value) => { dirty.current = true; setAvatar(value); };
  const updateHandle = (value: string) => { dirty.current = true; setHandle(value); };

  const save = async () => {
    const clean = handle.trim().replace(/^@/, "");
    if (!HANDLE_PATTERN.test(clean)) {
      toast({ title: "Choose a valid handle", description: "Use 3–24 letters, numbers, underscores, or periods.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    let avatarToSave = avatar;
    let previousPortraitPath: string | undefined;
    if (user && portraitBlob) {
      previousPortraitPath = avatar.portraitPath;
      const portraitPath = `${user.id}/portrait-${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(portraitPath, portraitBlob, { contentType: "image/webp", upsert: true });
      if (uploadError) {
        setSaving(false);
        toast({ title: "Couldn't save portrait", description: uploadError.message, variant: "destructive" });
        return;
      }
      avatarToSave = { ...avatar, portraitPath };
    }
    const { error } = user
      ? await supabase.from("profiles").update({ display_name: clean, avatar_config: avatarToSave as unknown as Json }).eq("user_id", user.id)
      : { error: new Error("Please sign in again.") };
    setSaving(false);
    if (error) {
      const duplicate = "code" in error && error.code === "23505";
      toast({ title: duplicate ? "Handle already taken" : "Couldn't save profile", description: duplicate ? "Try another handle." : error.message, variant: "destructive" });
      return;
    }
    setHandle(clean);
    setAvatar(avatarToSave);
    setPortraitBlob(undefined);
    if (user && previousPortraitPath?.startsWith(`${user.id}/`) && previousPortraitPath !== avatarToSave.portraitPath) {
      void supabase.storage.from("profile-avatars").remove([previousPortraitPath]);
    }
    dirty.current = false;
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    void clearPortraitDraft().catch(() => undefined);
    onSaved?.(clean, avatarToSave);
    window.dispatchEvent(new Event("dtt-profile-changed"));
    toast({ title: "Character saved", description: `Your new look is live as @${clean}.` });
  };

  const processPhoto = async (file: File) => {
    setProcessingPhoto(true);
    setPhotoStage("Mapping facial details…");
    try {
      file = await normalizeSelfie(file);
      if (file.size > 8 * 1024 * 1024) throw new Error("Choose a photo under 8 MB.");
      // Landmark detection improves the editable controls, but it must never block
      // the server portrait generator on devices that cannot load MediaPipe/WASM
      // or decode a camera-specific image format.
      let mappedAvatar = avatar;
      try {
        mappedAvatar = await mapFaceLandmarks(file, avatar);
      } catch {
        setPhotoStage("Reading your photo securely…");
      }
      updateAvatar(mappedAvatar);
      setPhotoStage("Creating illustrated portrait…");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please sign in again.");
      const form = new FormData();
      form.set("image", file, file.name || "selfie.jpg");
      form.set("style", mappedAvatar.style);
      form.set("appearance", JSON.stringify({
        skinTone: mappedAvatar.skinTone, hairColor: mappedAvatar.hairColor, eyebrows: mappedAvatar.eyebrows,
        ears: mappedAvatar.ears, jawline: mappedAvatar.jawline, eyeSpacing: mappedAvatar.eyeSpacing, noseShape: mappedAvatar.noseShape,
        hair: mappedAvatar.hair, facialHair: mappedAvatar.facialHair, glasses: mappedAvatar.glasses, clothing: mappedAvatar.clothing,
      }));
      const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-avatar-portrait`;
      await streamPortrait(endpoint, form, {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      }, (dataUrl, isFinal) => {
        setPortraitPreview(dataUrl);
        setPhotoStage(isFinal ? "Portrait ready" : "Rendering preview…");
        if (isFinal) void fetch(dataUrl).then((response) => response.blob()).then((blob) => {
          setPortraitBlob(blob);
          return savePortraitDraft(blob);
        }).catch(() => undefined);
      });
      toast({ title: "Your portrait is ready", description: "Review it, fine-tune your features, then save your profile." });
    } catch (error) {
      toast({ title: "Couldn't create portrait", description: error instanceof Error ? error.message : "Try another photo.", variant: "destructive" });
    } finally {
      setProcessingPhoto(false);
      setPhotoStage("");
    }
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-primary" />;

  return (
    <section className={compact ? "space-y-5" : "w-full max-w-md space-y-5"}>
      <div className="relative flex items-center gap-5 overflow-hidden border-b border-border bg-background/95 py-3 backdrop-blur">
        <div className="relative shrink-0 p-1">
          <ProfileAvatar config={avatar} previewUrl={portraitPreview} className={`h-28 w-28 border-[3px] border-primary neon-glow transition-all duration-200 sm:h-32 sm:w-32 ${processingPhoto && portraitPreview ? "blur-[2px]" : ""}`} label={handle || "Your"} />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-primary bg-background px-2 py-0.5 text-[8px] font-black uppercase text-primary">Avatar studio</span>
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Public identity</p>
          <p className="truncate text-lg font-bold text-foreground">@{handle || "your_handle"}</p>
          <p className="text-xs text-muted-foreground">Your email always stays private.</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => updateAvatar(DEFAULT_AVATAR)} title="Reset character" aria-label="Reset character">
          <RotateCcw />
        </Button>
      </div>

      <div className="text-left">
        <label htmlFor="display-handle" className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Display name / gaming handle</label>
        <Input id="display-handle" value={handle} maxLength={24} autoComplete="nickname" placeholder="neon_player" onChange={(event) => updateHandle(event.target.value.replace(/[^A-Za-z0-9_.]/g, ""))} />
      </div>

      <div className="space-y-5 rounded-lg border border-border bg-card/50 p-3 text-left shadow-2xl sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Avatar creator</p>
          <div className="flex rounded-full border border-border bg-background p-1" role="group" aria-label="Character style">
            {(["woman", "man"] as const).map((style) => (
              <Button
                key={style}
                type="button"
                variant={avatar.style === style ? "default" : "ghost"}
                size="sm"
                className="h-7 rounded-full px-4 text-[9px] font-black uppercase"
                aria-pressed={avatar.style === style}
                onClick={() => updateAvatar((current) => ({
                  ...current,
                  style,
                  jawline: style === "woman" ? "oval" : "strong",
                  hair: style === "woman" ? "waves" : "crop",
                  facialHair: style === "woman" ? "none" : current.facialHair,
                }))}
              >
                {style === "woman" ? "Women" : "Men"}
              </Button>
            ))}
          </div>
        </div>
        <input ref={cameraInput} type="file" accept="image/*" capture="user" className="sr-only" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void processPhoto(file);
          event.target.value = "";
        }} />
        <Button type="button" variant="outline" disabled={processingPhoto} className="h-14 w-full border-primary/70 bg-secondary text-base font-bold text-foreground hover:bg-secondary/80" onClick={() => {
          sessionStorage.setItem("dtt_active_tab", "profile");
          cameraInput.current?.click();
        }}>
          {processingPhoto ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
           {processingPhoto ? (photoStage || "Creating Your Portrait…") : "Snap Your Face for Emoji"}
        </Button>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Skin tone</p>
          <div className="grid grid-cols-6 gap-2 px-1">
            {AVATAR_SKIN_TONES.map((value) => <Button key={value} type="button" variant="outline" size="icon" title={pretty(value)} aria-pressed={avatar.skinTone === value} onClick={() => updateAvatar((current) => ({ ...current, skinTone: value }))} className={`aspect-square h-auto w-full rounded-full p-1 ${avatar.skinTone === value ? "border-primary ring-2 ring-primary/40 neon-glow-sm" : "border-border"}`}><span className={`h-full w-full rounded-full ${skinSwatches[value]}`} /><span className="sr-only">{pretty(value)}</span></Button>)}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hair &amp; facial hair</p>
          <div className="flex gap-2 overflow-x-auto p-1 pb-2 scrollbar-hide">
            {AVATAR_HAIR.map((value) => <Button key={`hair-${value}`} type="button" variant="outline" size="icon" title={pretty(value)} aria-pressed={avatar.hair === value} onClick={() => updateAvatar((current) => ({ ...current, hair: value }))} className={`h-12 w-12 shrink-0 rounded-full bg-secondary p-2 text-foreground [&_svg]:h-full [&_svg]:w-full ${avatar.hair === value ? "border-primary ring-2 ring-primary/40 neon-glow-sm" : "border-border"}`}><HairIcon value={value}/><span className="sr-only">{pretty(value)} hair</span></Button>)}
            {AVATAR_FACIAL_HAIR.map((value) => <Button key={`facial-${value}`} type="button" variant="outline" size="icon" title={pretty(value)} aria-pressed={avatar.facialHair === value} onClick={() => updateAvatar((current) => ({ ...current, facialHair: value }))} className={`h-12 w-12 shrink-0 rounded-full bg-secondary p-2 text-foreground [&_svg]:h-full [&_svg]:w-full ${avatar.facialHair === value ? "border-primary ring-2 ring-primary/40 neon-glow-sm" : "border-border"}`}><FacialHairIcon value={value}/><span className="sr-only">{pretty(value)}</span></Button>)}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Facial features</p>
          <div className="space-y-2">
            <div className="flex gap-2 overflow-x-auto p-1 scrollbar-hide">{AVATAR_EYEBROWS.map((value) => <Button key={value} type="button" variant="outline" size="icon" title={`${pretty(value)} eyebrows`} aria-pressed={avatar.eyebrows === value} onClick={() => updateAvatar((current) => ({ ...current, eyebrows: value }))} className={`h-12 w-12 shrink-0 rounded-full bg-secondary p-2 text-foreground [&_svg]:h-full [&_svg]:w-full ${avatar.eyebrows === value ? "border-primary ring-2 ring-primary/40" : "border-border"}`}><BrowIcon value={value}/></Button>)}</div>
            <div className="flex gap-2 overflow-x-auto p-1 scrollbar-hide">{AVATAR_EARS.map((value) => <Button key={value} type="button" variant="outline" size="icon" title={`${pretty(value)} ears`} aria-pressed={avatar.ears === value} onClick={() => updateAvatar((current) => ({ ...current, ears: value }))} className={`h-12 w-12 shrink-0 rounded-full bg-secondary text-foreground [&_svg]:h-7 [&_svg]:w-7 ${avatar.ears === value ? "border-primary ring-2 ring-primary/40" : "border-border"}`}><Ear strokeWidth={value === "small" ? 1.5 : value === "large" ? 3 : 2}/></Button>)}{AVATAR_JAWLINES.map((value) => <Button key={value} type="button" variant="outline" size="icon" title={`${pretty(value)} jaw`} aria-pressed={avatar.jawline === value} onClick={() => updateAvatar((current) => ({ ...current, jawline: value }))} className={`h-12 w-12 shrink-0 rounded-full bg-secondary p-2 text-foreground [&_svg]:h-full [&_svg]:w-full ${avatar.jawline === value ? "border-primary ring-2 ring-primary/40" : "border-border"}`}><JawIcon value={value}/></Button>)}</div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Accessories</p>
          <div className="flex gap-3 p-1">
            {AVATAR_GLASSES.map((value) => <Button key={value} type="button" variant="outline" size="icon" title={pretty(value)} aria-pressed={avatar.glasses === value} onClick={() => updateAvatar((current) => ({ ...current, glasses: value }))} className={`h-12 w-12 rounded-full bg-secondary text-foreground [&_svg]:h-7 [&_svg]:w-7 ${avatar.glasses === value ? "border-primary ring-2 ring-primary/40 neon-glow-sm" : "border-border"}`}>{value === "none" ? <span className="text-lg text-muted-foreground">—</span> : value === "aviator" ? <SunglassesIcon/> : <Glasses/>}<span className="sr-only">{pretty(value)}</span></Button>)}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Clothing</p>
          <div className="grid grid-cols-4 gap-2 p-1">
            {AVATAR_CLOTHING.map((value) => <Button key={value} type="button" variant="outline" title={pretty(value)} aria-pressed={avatar.clothing === value} onClick={() => updateAvatar((current) => ({ ...current, clothing: value }))} className={`h-14 min-w-0 flex-col gap-0.5 rounded-md bg-secondary px-1 text-foreground ${avatar.clothing === value ? "border-primary ring-2 ring-primary/40 neon-glow-sm" : "border-border"}`}><Shirt className="h-5 w-5"/><span className="truncate text-[8px] font-bold uppercase">{pretty(value)}</span></Button>)}
          </div>
          {(portraitPreview || avatar.portraitPath) && <p className="mt-2 text-[10px] text-muted-foreground">Snap again after changing features or clothing to refresh your illustrated portrait.</p>}
        </div>
      </div>

      <Button variant="neon" className="w-full" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
        SAVE PUBLIC PROFILE
      </Button>
    </section>
  );
};

export default ProfileIdentityEditor;