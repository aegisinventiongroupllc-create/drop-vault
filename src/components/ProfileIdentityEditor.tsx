import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2 } from "lucide-react";
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
  DEFAULT_AVATAR, parseAvatarConfig, type AvatarConfig,
} from "@/components/ProfileAvatar";

const HANDLE_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_.]{2,23}$/;

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
    let uploadedPortraitPath: string | undefined;
    if (user && portraitBlob) {
      previousPortraitPath = avatar.portraitPath;
      const portraitPath = `${user.id}/portrait-${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(portraitPath, portraitBlob, { contentType: "image/webp", upsert: true });
      if (uploadError) {
        setSaving(false);
        toast({ title: "Couldn't save portrait", description: uploadError.message, variant: "destructive" });
        return;
      }
      uploadedPortraitPath = portraitPath;
      avatarToSave = { ...avatar, portraitPath };
    }
    const { error } = user
      ? await supabase.from("profiles").update({ display_name: clean, avatar_config: avatarToSave as unknown as Json }).eq("user_id", user.id)
      : { error: new Error("Please sign in again.") };
    setSaving(false);
    if (error) {
      if (uploadedPortraitPath) void supabase.storage.from("profile-avatars").remove([uploadedPortraitPath]);
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
    toast({ title: "Private identity saved", description: `Your emoji is saved to @${clean}.` });
  };

  const processPhoto = async (file: File) => {
    // Admin passcode previews have no member account, so portraits can't be made or saved there.
    const { data: { session: startSession } } = await supabase.auth.getSession();
    if (!startSession) {
      toast({ title: "Log in with a real account", description: "Admin preview has no account. Log in with a creator or customer email to make and save your emoji.", variant: "destructive" });
      return;
    }
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
      if (!session) throw new Error("Your login expired. Log in again, then retake your photo.");
      const form = new FormData();
      form.set("image", file, file.name || "selfie.jpg");
      form.set("style", mappedAvatar.style);
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
      toast({ title: "Your emoji is ready", description: "Review it, then save your private identity." });
    } catch (error) {
      toast({ title: "Couldn't create avatar", description: error instanceof Error ? error.message : "Try another photo.", variant: "destructive" });
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
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-primary bg-background px-2 py-0.5 text-[8px] font-black uppercase text-primary">Private emoji</span>
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Private identity</p>
          <p className="truncate text-lg font-bold text-foreground">@{handle || "your_handle"}</p>
          <p className="text-xs text-muted-foreground">Your email always stays private.</p>
        </div>
      </div>

      <div className="text-left">
        <label htmlFor="display-handle" className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Public avatar name</label>
        <Input id="display-handle" value={handle} maxLength={24} autoComplete="nickname" placeholder="neon_player" onChange={(event) => updateHandle(event.target.value.replace(/[^A-Za-z0-9_.]/g, ""))} />
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-card/50 p-3 text-left shadow-2xl sm:p-4">
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Choose your emoji style</p>
          <div className="grid grid-cols-2 rounded-md border border-border bg-background p-1" role="group" aria-label="Emoji style">
            {(["woman", "man"] as const).map((style) => (
              <Button
                key={style}
                type="button"
                variant={avatar.style === style ? "default" : "ghost"}
                size="sm"
                className="h-10 rounded px-4 text-xs font-black uppercase"
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
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Button type="button" variant="outline" disabled={processingPhoto} className="h-14 w-full border-primary/70 bg-secondary px-3 text-sm font-bold text-foreground hover:bg-secondary/80 sm:text-base" onClick={() => {
            sessionStorage.setItem("dtt_active_tab", "profile");
            updateAvatar((current) => ({ ...current, useDttIcon: undefined }));
            cameraInput.current?.click();
          }}>
            {processingPhoto ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
             {processingPhoto ? (photoStage || "Creating Your 3D Avatar…") : "Snap Your Face for Emoji"}
          </Button>
          <Button
            type="button"
            variant={avatar.useDttIcon && !portraitBlob ? "default" : "outline"}
            disabled={processingPhoto}
            aria-pressed={!!avatar.useDttIcon && !portraitBlob}
            className="h-14 border-primary/70 px-4 text-sm font-black"
            onClick={() => {
              setPortraitBlob(undefined);
              setPortraitPreview(undefined);
              void clearPortraitDraft().catch(() => undefined);
              updateAvatar((current) => ({ ...current, useDttIcon: true }));
            }}
          >
            Use DTT
          </Button>
        </div>
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Your selfie is never saved. It is processed securely and deleted from our systems after your emoji is created.
        </p>
      </div>

      <Button variant="neon" className="w-full" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
        SAVE PRIVATE IDENTITY
      </Button>
    </section>
  );
};

export default ProfileIdentityEditor;