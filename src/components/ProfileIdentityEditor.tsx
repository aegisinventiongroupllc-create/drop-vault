import { useEffect, useRef, useState } from "react";
import { Camera, Check, Ear, Glasses, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import ProfileAvatar, {
  AVATAR_EARS, AVATAR_EYEBROWS, AVATAR_FACIAL_HAIR, AVATAR_GLASSES, AVATAR_HAIR,
  AVATAR_JAWLINES, AVATAR_SKIN_TONES, DEFAULT_AVATAR,
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

const loadImage = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error("This image could not be read."));
  };
  image.src = objectUrl;
});

const averageRegion = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
  const pixels = context.getImageData(x, y, width, height).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  let samples = 0;
  for (let index = 0; index < pixels.length; index += 16) {
    if (pixels[index + 3] < 128) continue;
    red += pixels[index];
    green += pixels[index + 1];
    blue += pixels[index + 2];
    samples += 1;
  }
  return samples ? { red: red / samples, green: green / samples, blue: blue / samples } : { red: 128, green: 100, blue: 85 };
};

const mapPhotoToAvatar = async (file: File, current: AvatarConfig): Promise<AvatarConfig> => {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 160;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Photo processing is unavailable on this device.");

  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
  const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 160, 160);

  const face = averageRegion(context, 52, 50, 56, 72);
  const hair = averageRegion(context, 42, 18, 76, 34);
  const full = averageRegion(context, 20, 20, 120, 120);
  const faceLight = (face.red * 0.299) + (face.green * 0.587) + (face.blue * 0.114);
  const hairLight = (hair.red * 0.299) + (hair.green * 0.587) + (hair.blue * 0.114);
  const contrast = Math.abs(faceLight - hairLight);
  const imageSeed = Math.round(full.red + full.green * 2 + full.blue * 3);

  const skinTone: AvatarConfig["skinTone"] = faceLight > 210 ? "light" : faceLight > 180 ? "warm" : faceLight > 145 ? "medium" : faceLight > 110 ? "deep" : faceLight > 78 ? "rich" : "dark";
  const hairColor: AvatarConfig["hairColor"] = hairLight < 55 ? "dark" : hair.red > hair.green * 1.3 ? "red" : hair.red > 145 && hair.green > 120 ? "blonde" : hairLight > 175 ? "silver" : "brown";
  const womanHair: AvatarConfig["hair"][] = ["waves", "long", "curls", "crop"];
  const manHair: AvatarConfig["hair"][] = ["crop", "waves", "curls", "mohawk"];
  const hairOptions = current.style === "woman" ? womanHair : manHair;
  const browOptions: AvatarConfig["eyebrows"][] = ["soft", "straight", "arched", "bold"];
  const jawOptions: AvatarConfig["jawline"][] = current.style === "woman" ? ["oval", "heart", "soft", "tapered"] : ["square", "strong", "tapered", "oval"];

  return {
    ...current,
    skinTone,
    hairColor,
    hair: contrast < 18 ? "none" : hairOptions[imageSeed % hairOptions.length],
    eyebrows: browOptions[Math.floor(imageSeed / 3) % browOptions.length],
    jawline: jawOptions[Math.floor(imageSeed / 7) % jawOptions.length],
    ears: contrast > 95 ? "large" : contrast > 55 ? "medium" : "small",
    facialHair: current.style === "man" && hairLight < 80 ? (["stubble", "goatee", "beard"] as const)[imageSeed % 3] : "none",
  };
};

const ProfileIdentityEditor = ({ compact = false, onSaved }: { compact?: boolean; onSaved?: (handle: string, avatar: AvatarConfig) => void }) => {
  const [handle, setHandle] = useState("");
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const cameraInput = useRef<HTMLInputElement>(null);

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

  const processPhoto = async (file: File) => {
    setProcessingPhoto(true);
    try {
      const mappedAvatar = await mapPhotoToAvatar(file, avatar);
      setAvatar(mappedAvatar);
      toast({ title: "Your emoji is ready", description: "Review the preview, tweak any feature, then save your profile." });
    } catch (error) {
      toast({ title: "Couldn't process photo", description: error instanceof Error ? error.message : "Try another photo.", variant: "destructive" });
    } finally {
      setProcessingPhoto(false);
    }
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-primary" />;

  return (
    <section className={compact ? "space-y-5" : "w-full max-w-md space-y-5"}>
      <div className="relative flex items-center gap-5 overflow-hidden border-b border-border bg-background/95 py-3 backdrop-blur">
        <div className="relative shrink-0 p-1">
          <ProfileAvatar config={avatar} className="h-28 w-28 border-[3px] border-primary neon-glow transition-all duration-200 sm:h-32 sm:w-32" label={handle || "Your"} />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-primary bg-background px-2 py-0.5 text-[8px] font-black uppercase text-primary">Avatar studio</span>
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Public identity</p>
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
                onClick={() => setAvatar((current) => ({
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
          {processingPhoto ? "Creating Your Emoji…" : "Snap Your Face for Emoji"}
        </Button>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Skin tone</p>
          <div className="grid grid-cols-6 gap-2 px-1">
            {AVATAR_SKIN_TONES.map((value) => <Button key={value} type="button" variant="outline" size="icon" title={pretty(value)} aria-pressed={avatar.skinTone === value} onClick={() => setAvatar((current) => ({ ...current, skinTone: value }))} className={`aspect-square h-auto w-full rounded-full p-1 ${avatar.skinTone === value ? "border-primary ring-2 ring-primary/40 neon-glow-sm" : "border-border"}`}><span className={`h-full w-full rounded-full ${skinSwatches[value]}`} /><span className="sr-only">{pretty(value)}</span></Button>)}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hair &amp; facial hair</p>
          <div className="flex gap-2 overflow-x-auto p-1 pb-2 scrollbar-hide">
            {AVATAR_HAIR.map((value) => <Button key={`hair-${value}`} type="button" variant="outline" size="icon" title={pretty(value)} aria-pressed={avatar.hair === value} onClick={() => setAvatar((current) => ({ ...current, hair: value }))} className={`h-12 w-12 shrink-0 rounded-full bg-secondary p-2 text-foreground [&_svg]:h-full [&_svg]:w-full ${avatar.hair === value ? "border-primary ring-2 ring-primary/40 neon-glow-sm" : "border-border"}`}><HairIcon value={value}/><span className="sr-only">{pretty(value)} hair</span></Button>)}
            {AVATAR_FACIAL_HAIR.map((value) => <Button key={`facial-${value}`} type="button" variant="outline" size="icon" title={pretty(value)} aria-pressed={avatar.facialHair === value} onClick={() => setAvatar((current) => ({ ...current, facialHair: value }))} className={`h-12 w-12 shrink-0 rounded-full bg-secondary p-2 text-foreground [&_svg]:h-full [&_svg]:w-full ${avatar.facialHair === value ? "border-primary ring-2 ring-primary/40 neon-glow-sm" : "border-border"}`}><FacialHairIcon value={value}/><span className="sr-only">{pretty(value)}</span></Button>)}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Facial features</p>
          <div className="space-y-2">
            <div className="flex gap-2 overflow-x-auto p-1 scrollbar-hide">{AVATAR_EYEBROWS.map((value) => <Button key={value} type="button" variant="outline" size="icon" title={`${pretty(value)} eyebrows`} aria-pressed={avatar.eyebrows === value} onClick={() => setAvatar((current) => ({ ...current, eyebrows: value }))} className={`h-12 w-12 shrink-0 rounded-full bg-secondary p-2 text-foreground [&_svg]:h-full [&_svg]:w-full ${avatar.eyebrows === value ? "border-primary ring-2 ring-primary/40" : "border-border"}`}><BrowIcon value={value}/></Button>)}</div>
            <div className="flex gap-2 overflow-x-auto p-1 scrollbar-hide">{AVATAR_EARS.map((value) => <Button key={value} type="button" variant="outline" size="icon" title={`${pretty(value)} ears`} aria-pressed={avatar.ears === value} onClick={() => setAvatar((current) => ({ ...current, ears: value }))} className={`h-12 w-12 shrink-0 rounded-full bg-secondary text-foreground [&_svg]:h-7 [&_svg]:w-7 ${avatar.ears === value ? "border-primary ring-2 ring-primary/40" : "border-border"}`}><Ear strokeWidth={value === "small" ? 1.5 : value === "large" ? 3 : 2}/></Button>)}{AVATAR_JAWLINES.map((value) => <Button key={value} type="button" variant="outline" size="icon" title={`${pretty(value)} jaw`} aria-pressed={avatar.jawline === value} onClick={() => setAvatar((current) => ({ ...current, jawline: value }))} className={`h-12 w-12 shrink-0 rounded-full bg-secondary p-2 text-foreground [&_svg]:h-full [&_svg]:w-full ${avatar.jawline === value ? "border-primary ring-2 ring-primary/40" : "border-border"}`}><JawIcon value={value}/></Button>)}</div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Accessories</p>
          <div className="flex gap-3 p-1">
            {AVATAR_GLASSES.map((value) => <Button key={value} type="button" variant="outline" size="icon" title={pretty(value)} aria-pressed={avatar.glasses === value} onClick={() => setAvatar((current) => ({ ...current, glasses: value }))} className={`h-12 w-12 rounded-full bg-secondary text-foreground [&_svg]:h-7 [&_svg]:w-7 ${avatar.glasses === value ? "border-primary ring-2 ring-primary/40 neon-glow-sm" : "border-border"}`}>{value === "none" ? <span className="text-lg text-muted-foreground">—</span> : value === "aviator" ? <SunglassesIcon/> : <Glasses/>}<span className="sr-only">{pretty(value)}</span></Button>)}
          </div>
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