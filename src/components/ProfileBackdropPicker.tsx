import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ProfileAvatar from "@/components/ProfileAvatar";
import { prepareBackdrop, profileBackdropImage, saveProfileBackdrop, searchProfileBackdrops } from "@/lib/profileBackdrops";
import { creatorBackdropImage, parseCreatorBackdrop } from "@/lib/creatorBackdrop";

export default function ProfileBackdropPicker({ creator = false }: { creator?: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [season, setSeason] = useState("All");
  const [selected, setSelected] = useState("beach");
  const [saved, setSaved] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>();
  const [file, setFile] = useState<File>();
  const [previousPath, setPreviousPath] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<unknown>();
  const [photo, setPhoto] = useState<string | null>();
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(true);
  const [eligible, setEligible] = useState(!creator);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Please sign in again.");
        const [setting, identity] = await Promise.all([
          supabase.from("profile_backdrop_settings").select("design_id,upload_path").eq("user_id", user.id).maybeSingle(),
          supabase.from("profiles").select("avatar_config").eq("user_id", user.id).single(),
        ]);
        if (setting.error) throw setting.error;
        if (!active) return;
        setAvatar(identity.data?.avatar_config);
        setSelected(setting.data?.design_id ?? "beach"); setSaved(setting.data?.design_id ?? null); setPreviousPath(setting.data?.upload_path ?? null);
        if (setting.data?.upload_path) {
          const result = await supabase.storage.from("profile-backdrops").createSignedUrl(setting.data.upload_path, 600);
          if (result.error) throw result.error;
          if (active) setPreview(result.data.signedUrl);
        }
        if (creator) {
          const [permission, photos] = await Promise.all([supabase.rpc("can_upload_creator_media", { _creator_id: user.id }), supabase.from("public_profiles").select("profile_photo_path").eq("user_id", user.id).maybeSingle()]);
          if (active) { setEligible(permission.data === true); setPhoto(photos.data?.profile_photo_path); }
        }
      } catch (error) { if (active) toast({ title: "Couldn't load backdrop", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" }); }
      finally { if (active) setBusy(false); }
    })();
    return () => { active = false; };
  }, [creator]);
  useEffect(() => () => { if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);
  const chooseFile = async (value?: File) => {
    if (!value) return;
    setBusy(true);
    try { const safe = await prepareBackdrop(value, creator); setFile(safe); setPreview(URL.createObjectURL(safe)); setRights(false); }
    catch (error) { toast({ title: "Image not accepted", description: error instanceof Error ? error.message : "Try a different image.", variant: "destructive" }); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };
  const save = async () => {
    setBusy(true);
    let uploaded: string | undefined;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in again.");
      if (file) {
        if (!rights) throw new Error("Confirm your image permission first.");
        uploaded = `${user.id}/backdrop-${crypto.randomUUID()}.jpg`;
        const result = await supabase.storage.from("profile-backdrops").upload(uploaded, file, { contentType: "image/jpeg", upsert: false });
        if (result.error) throw result.error;
      }
      await saveProfileBackdrop(uploaded ? null : selected, uploaded ?? null);
      setSaved(uploaded ? null : selected); setPreviousPath(uploaded ?? null); setFile(undefined);
      if (previousPath && previousPath !== uploaded) {
        const cleanup = await supabase.storage.from("profile-backdrops").remove([previousPath]);
        if (cleanup.error) toast({ title: "Backdrop saved", description: "The previous image could not be removed. Please try again later." });
      }
      toast({ title: "Profile backdrop saved" });
    } catch (error) {
      let cleanupFailed = false;
      if (uploaded) cleanupFailed = Boolean((await supabase.storage.from("profile-backdrops").remove([uploaded])).error);
      toast({ title: "Backdrop not saved", description: cleanupFailed ? "Upload cleanup failed. Please try again later." : (error as { message?: string }).message ?? "Please try again.", variant: "destructive" });
    } finally { setBusy(false); }
  };
  const results = searchProfileBackdrops(query, category, season);
  const image = preview ?? profileBackdropImage(selected) ?? (parseCreatorBackdrop(selected) ? creatorBackdropImage(selected) : profileBackdropImage("beach"));
  return <section className="space-y-4 border-t border-border py-5" aria-label={creator ? "Public creator backdrop" : "Private profile backdrop"}>
    <div><h3 className="font-semibold text-foreground">{creator ? "Public page backdrop" : "Private profile backdrop"}</h3><p className="text-xs text-muted-foreground">{creator ? "Visible on your creator page." : "Only you can see your customer backdrop."}</p></div>
    <div className="relative isolate flex h-40 items-end justify-center overflow-hidden rounded-md bg-card pb-3">
      <img src={image} alt="Selected profile backdrop" className="absolute inset-0 h-full w-full object-cover" />
      <ProfileAvatar config={avatar} creatorPhotoPath={creator ? photo : undefined} label="Your profile" className="relative z-10 h-24 w-24 border-4 border-background" />
    </div>
    <Input aria-label="Search backdrop designs" placeholder="Search interests, flowers, gaming…" value={query} onChange={event => setQuery(event.target.value)} />
    <div className="grid grid-cols-2 gap-2">
      <Select value={category} onValueChange={setCategory}><SelectTrigger aria-label="Interest category"><SelectValue /></SelectTrigger><SelectContent>{["All", "Nature", "Gaming", "Cars", "Luxury"].map(value => <SelectItem key={value} value={value}>{value === "All" ? "All interests" : value}</SelectItem>)}</SelectContent></Select>
      <Select value={season} onValueChange={setSeason}><SelectTrigger aria-label="Season"><SelectValue /></SelectTrigger><SelectContent>{["All", "Spring", "Summer", "Autumn", "Winter"].map(value => <SelectItem key={value} value={value}>{value === "All" ? "All seasons" : value}</SelectItem>)}</SelectContent></Select>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {results.map(item => <Button variant="outline" key={item.id} disabled={busy} aria-pressed={!preview && selected === item.id} onClick={() => { setSelected(item.id); setPreview(undefined); setFile(undefined); }} className={`h-auto min-w-0 flex-col overflow-hidden p-0 ${!preview && selected === item.id ? "border-primary ring-1 ring-primary" : ""}`}><img src={item.image} alt="" loading="lazy" width={384} height={512} className="h-24 w-full object-cover" /><span className="w-full whitespace-normal p-2 text-xs">{item.label}</span></Button>)}
    </div>
    {!results.length && <p className="text-sm text-muted-foreground">No matching designs. Try another interest or upload your own.</p>}
    <input ref={input} type="file" className="hidden" aria-label="Upload profile backdrop" accept="image/jpeg,image/png,image/webp" onChange={event => void chooseFile(event.target.files?.[0])} />
    <Button variant="outline" className="w-full" disabled={busy || !eligible} onClick={() => input.current?.click()}>Upload your image</Button>
    <p className="text-xs text-muted-foreground">JPG, PNG or WebP · up to 5 MB. Non-explicit artwork only. {creator && !eligible ? "Identity approval is required for creator uploads; gallery designs are available now." : ""}</p>
    {file && <label className="flex items-start gap-2 text-xs text-muted-foreground"><Checkbox checked={rights} onCheckedChange={value => setRights(value === true)} aria-label="Image permission confirmation" /><span>I own this non-explicit image or have permission to use it, and it contains no private identity documents.</span></label>}
    <Button className="w-full" disabled={busy || (file ? !rights : selected === saved || Boolean(preview))} onClick={() => void save()}>{busy ? "Please wait…" : "Save backdrop"}</Button>
  </section>;
}