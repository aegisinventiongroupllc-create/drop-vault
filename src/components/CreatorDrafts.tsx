import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { watermarkCreatorMedia } from "@/lib/mediaWatermark";
import { uploadBrandedFile } from "@/lib/resumableUpload";
import { toast } from "sonner";

type Draft = { id: string; title: string; kind: string; storage_path: string };
export default function CreatorDrafts({ userId, approved }: { userId: string; approved: boolean }) {
  const [rows, setRows] = useState<Draft[]>([]);
  const [eligible, setEligible] = useState(false);
  const [kind, setKind] = useState("video");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    const [access, result] = await Promise.all([
      supabase.rpc("can_stage_creator_draft", { _user: userId }),
      supabase.from("creator_drafts").select("id,title,kind,storage_path").eq("creator_id",userId).order("created_at",{ascending:false}).limit(50),
    ]);
    setEligible(!access.error && access.data === true);
    setRows(result.data ?? []);
    setError(result.error?.message ?? access.error?.message ?? "");
  }, [userId]);
  useEffect(() => { void load(); }, [load, approved]);
  const upload = async (file?: File) => {
    if (!file || !eligible || busy) return;
    if (file.size > 512*1024*1024 || !(file.type.startsWith("image/") || file.type.startsWith("video/"))) { toast.error("Choose a photo or video up to 512 MB."); return; }
    setBusy(true); setError("");
    let path: string | undefined;
    try {
      const branded = await watermarkCreatorMedia(file,(message) => setProgress(message));
      path = `${userId}/${crypto.randomUUID()}.${branded.type.startsWith("image/") ? "jpg" : "mp4"}`;
      const saved = await uploadBrandedFile("creator-drafts",path,branded,(message,percent) => setProgress(`${message} ${percent}%`));
      if (saved.error) throw new Error(saved.error.message);
      const registration = await supabase.from("creator_drafts").insert({creator_id:userId,title:title.trim() || file.name,kind,storage_path:path});
      if (registration.error) throw registration.error;
      path = undefined;
      setTitle(""); await load(); toast.success("Private draft saved");
    } catch (failure) {
      if (path) {
        const cleanup = await supabase.storage.from("creator-drafts").remove([path]);
        if (cleanup.error) toast.error("Draft failed and cleanup could not finish. Contact DTT support.");
      }
      setError(failure instanceof Error ? failure.message : "Could not save draft.");
    } finally { setBusy(false); setProgress(""); if(input.current) input.current.value=""; }
  };
  const preview = async (row: Draft) => {
    const result = await supabase.storage.from("creator-drafts").createSignedUrl(row.storage_path,60);
    if(result.error || !result.data) { toast.error("Could not open private draft."); return; }
    window.open(result.data.signedUrl,"_blank","noopener,noreferrer");
  };
  const remove = async (row: Draft) => {
    if(busy) return;
    setBusy(true);
    try {
      const result = await supabase.storage.from("creator-drafts").remove([row.storage_path]);
      if(result.error) throw result.error;
      const deleted = await supabase.from("creator_drafts").delete().eq("id",row.id).eq("creator_id",userId);
      if(deleted.error) throw deleted.error;
      await load();
    } catch { toast.error("Could not finish deleting draft. Refresh and retry."); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4 py-4">
    <h2 className="text-lg font-bold">PRIVATE DRAFTS</h2>
    <p className="text-sm text-muted-foreground">Private preparation only. Identity approval and participant clearance are required before publishing.</p>
    {approved && <p className="text-sm text-success">Your identity is approved. Submit content evidence in VERIFY before moving a draft into your live library.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
      <Input aria-label="Draft title" placeholder="Draft title" maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} />
      <select aria-label="Draft type" className="rounded-md border border-border bg-secondary p-2" value={kind} onChange={e=>setKind(e.target.value)}><option value="photo">Profile photo</option><option value="teaser">Teaser</option><option value="video">Library video</option></select>
      <Button variant="neon" disabled={!eligible || busy} onClick={()=>input.current?.click()}>{busy ? "SAVING…" : "UPLOAD PRIVATE DRAFT"}</Button>
    </div>
    <input ref={input} type="file" aria-label="Private draft file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" className="sr-only" onChange={e=>void upload(e.target.files?.[0])} />
    {progress && <p role="status" className="text-sm text-gold">{progress}</p>}
    {!eligible && <p className="text-sm text-muted-foreground">Draft uploads are unavailable for this account.</p>}
    <div className="divide-y divide-border">{rows.map(row=><article key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="break-words font-semibold">{row.title}</p><p className="text-xs text-muted-foreground">{row.kind.toUpperCase()} · PRIVATE DRAFT</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={()=>void preview(row)}>PREVIEW</Button><Button variant="outline" size="sm" disabled={busy} onClick={()=>void remove(row)}>DELETE</Button></div></article>)}</div>
    {!rows.length && <p className="text-sm text-muted-foreground">No private drafts yet.</p>}
  </section>;
}