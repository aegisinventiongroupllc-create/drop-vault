import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { normalizeSelfie } from "@/lib/normalizeSelfie";
import { toast } from "@/hooks/use-toast";

type CreatorPhoto = {
  id: string;
  storage_path: string;
  is_active: boolean;
  created_at: string;
};

const signedUrlCache = new Map<string, string>();

const CreatorProfilePhotoGallery = ({ creatorId, onActiveChange }: { creatorId: string; onActiveChange?: (path?: string) => void }) => {
  const [photos, setPhotos] = useState<CreatorPhoto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = async () => {
    const { data, error } = await supabase
      .from("creator_profile_photos")
      .select("id, storage_path, is_active, created_at")
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Couldn't load profile photos", description: error.message, variant: "destructive" });
      return;
    }
    const rows = (data ?? []) as CreatorPhoto[];
    setPhotos(rows);
    onActiveChange?.(rows.find((photo) => photo.is_active)?.storage_path);
    const nextUrls: Record<string, string> = {};
    await Promise.all(rows.map(async (photo) => {
      const cached = signedUrlCache.get(photo.storage_path);
      if (cached) { nextUrls[photo.id] = cached; return; }
      const { data: signed } = await supabase.storage.from("creator-profile-photos").createSignedUrl(photo.storage_path, 3600);
      if (signed?.signedUrl) {
        signedUrlCache.set(photo.storage_path, signed.signedUrl);
        nextUrls[photo.id] = signed.signedUrl;
      }
    }));
    setUrls(nextUrls);
  };

  useEffect(() => { void loadPhotos(); }, [creatorId]);

  const uploadPhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Choose a photo", description: "Use a JPG, PNG, or WEBP image.", variant: "destructive" });
      return;
    }
    setBusy(true);
    let storagePath: string | undefined;
    let insertedPhotoId: string | undefined;
    try {
      const normalized = await normalizeSelfie(file, 1600);
      if (normalized.size > 8 * 1024 * 1024) throw new Error("Choose a photo under 8 MB.");
      storagePath = `${creatorId}/profile-${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("creator-profile-photos")
        .upload(storagePath, normalized, { contentType: "image/jpeg", upsert: false });
      if (uploadError) throw uploadError;
      const { data: inserted, error: insertError } = await supabase
        .from("creator_profile_photos")
        .insert({ creator_id: creatorId, storage_path: storagePath })
        .select("id")
        .single();
      if (insertError || !inserted) throw insertError ?? new Error("Couldn't register this photo.");
      insertedPhotoId = inserted.id;
      if (photos.length === 0) {
        const { error: activeError } = await supabase.rpc("set_active_creator_profile_photo", { _photo_id: inserted.id });
        if (activeError) throw activeError;
      }
      await loadPhotos();
      window.dispatchEvent(new Event("dtt-creator-photo-changed"));
      toast({ title: photos.length === 0 ? "Public profile photo saved" : "Photo added", description: photos.length === 0 ? "Members can now recognize your creator profile." : "Tap a photo to make it public." });
    } catch (error) {
      if (insertedPhotoId) void supabase.from("creator_profile_photos").delete().eq("id", insertedPhotoId).eq("creator_id", creatorId);
      if (storagePath) void supabase.storage.from("creator-profile-photos").remove([storagePath]);
      toast({ title: "Couldn't upload photo", description: error instanceof Error ? error.message : "Try another image.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const makeActive = async (photo: CreatorPhoto) => {
    if (photo.is_active || busy) return;
    setBusy(true);
    const { error } = await supabase.rpc("set_active_creator_profile_photo", { _photo_id: photo.id });
    if (error) toast({ title: "Couldn't select photo", description: error.message, variant: "destructive" });
    else {
      await loadPhotos();
      window.dispatchEvent(new Event("dtt-creator-photo-changed"));
      toast({ title: "Public profile photo updated" });
    }
    setBusy(false);
  };

  const removePhoto = async (photo: CreatorPhoto) => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.from("creator_profile_photos").delete().eq("id", photo.id).eq("creator_id", creatorId);
    if (error) {
      toast({ title: "Couldn't delete photo", description: error.message, variant: "destructive" });
      setBusy(false);
      return;
    }
    await supabase.storage.from("creator-profile-photos").remove([photo.storage_path]);
    const remaining = photos.filter((item) => item.id !== photo.id);
    if (photo.is_active && remaining[0]) await supabase.rpc("set_active_creator_profile_photo", { _photo_id: remaining[0].id });
    signedUrlCache.delete(photo.storage_path);
    await loadPhotos();
    window.dispatchEvent(new Event("dtt-creator-photo-changed"));
    toast({ title: "Photo deleted" });
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Public Profile Photos</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Your selected real photo appears in the feed, creator page, and member libraries. Your emoji remains in private conversations.</p>
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void uploadPhoto(file);
        event.target.value = "";
      }} />
      <Button type="button" variant="outline" className="w-full border-primary/50" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        ADD PROFILE PHOTO
      </Button>

      {photos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground">Add a clear photo of yourself. Your first photo becomes your public creator picture.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className={`relative aspect-square overflow-hidden rounded-lg border-2 ${photo.is_active ? "border-primary neon-glow-sm" : "border-border"}`}>
              {urls[photo.id] ? <img src={urls[photo.id]} alt="Creator profile option" className="h-full w-full object-cover" /> : <div className="h-full w-full animate-pulse bg-secondary" />}
              <Button type="button" size="icon" variant="secondary" className="absolute bottom-1 left-1 h-8 w-8" disabled={busy || photo.is_active} onClick={() => void makeActive(photo)} aria-label={photo.is_active ? "Current public photo" : "Make this public photo"}>
                <Check className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="destructive" className="absolute bottom-1 right-1 h-8 w-8" disabled={busy} onClick={() => void removePhoto(photo)} aria-label="Delete this profile photo">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Only the photo marked with the check is shown to members.</p>
    </div>
  );
};

export default CreatorProfilePhotoGallery;