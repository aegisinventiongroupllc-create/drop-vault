import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import IdentityDatePicker from "@/components/IdentityDatePicker";
import { identityAge, validIdentityImage } from "@/lib/identityVerification";

type Status = "unsubmitted" | "pending" | "approved" | "rejected";
export default function CreatorIdVerification({ userId, onApproved }: { userId: string; onApproved?: () => void }) {
  const [status, setStatus] = useState<Status>("unsubmitted");
  const [notes, setNotes] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("");
  const [files, setFiles] = useState<{ front?: File; selfie?: File }>({});
  const [previews, setPreviews] = useState<{ front?: string; selfie?: string }>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.from("profiles").select("verification_status,verification_reviewer_notes,legal_first_name,legal_last_name,date_of_birth,display_name").eq("user_id", userId).maybeSingle();
      if (!active) return;
      if (error) toast.error("Could not load identity status");
      if (data) {
        setStatus(data.verification_status as Status); setNotes(data.verification_reviewer_notes);
        setName([data.legal_first_name, data.legal_last_name].filter(Boolean).join(" ")); setDob(data.date_of_birth ?? ""); setUsername(data.display_name ?? "");
      }
      setLoading(false);
    };
    void load();
    const timer = window.setInterval(load, 15000);
    window.addEventListener("focus", load);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", load); };
  }, [userId]);
  useEffect(() => { if (status === "approved") onApproved?.(); }, [status, onApproved]);
  useEffect(() => {
    const next = { front: files.front ? URL.createObjectURL(files.front) : undefined, selfie: files.selfie ? URL.createObjectURL(files.selfie) : undefined };
    setPreviews(next);
    return () => { Object.values(next).forEach(url => { if (url) URL.revokeObjectURL(url); }); };
  }, [files]);
  const pick = (slot: "front" | "selfie", file?: File) => {
    if (!file) return;
    if (!validIdentityImage(file)) { toast.error("Choose a JPG, PNG or WebP image up to 10 MB."); return; }
    setFiles(current => ({ ...current, [slot]: file }));
  };
  const submit = async () => {
    const age = identityAge(dob);
    if (name.trim().length < 2 || name.trim().length > 160 || age === null || age < 18 || !files.front || !files.selfie) { toast.error("Enter your legal name, an adult date of birth and both photos."); return; }
    setBusy(true);
    const uploaded: string[] = [];
    try {
      for (const [slot, file] of [["front", files.front], ["selfie", files.selfie]] as const) {
        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const path = `${userId}/${crypto.randomUUID()}-${slot}.${ext}`;
        const { error } = await supabase.storage.from("identity-documents").upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw error;
        uploaded.push(path);
      }
      const { error } = await supabase.rpc("submit_creator_identity", { _full_name: name.trim(), _dob: dob, _front: uploaded[0], _selfie: uploaded[1] });
      if (error) throw error;
      setStatus("pending"); setFiles({}); toast.success("Submitted for review");
    } catch (error) {
      if (uploaded.length) {
        const cleanup = await supabase.storage.from("identity-documents").remove(uploaded);
        if (cleanup.error) toast.error("Submission failed and photo cleanup could not finish. Contact DTT support.");
      }
      toast.error("Submission failed", { description: error instanceof Error ? error.message : "Please try again." });
    } finally { setBusy(false); }
  };
  if (loading) return <p className="text-muted-foreground">Loading verification…</p>;
  if (status === "approved") return <div className="border border-success rounded-md p-4"><h3 className="font-bold text-success">Identity Verified</h3><p className="text-sm text-muted-foreground">Your documents were approved. Content uploads are available subject to account requirements.</p></div>;
  return <div className="space-y-4">
    <h3 className="font-semibold text-foreground">Identity Verification Required to Upload Content</h3>
    {status === "pending" ? <p className="text-gold">Your submission is pending review. Uploads remain locked.</p> : <>
      {status === "rejected" && <div role="alert" className="border border-destructive rounded-md p-3 text-sm"><p className="font-bold text-destructive">Submission declined</p><p className="text-foreground whitespace-pre-wrap">{notes}</p></div>}
      <label className="block text-sm text-muted-foreground">Full Legal Name<Input aria-label="Full Legal Name" value={name} maxLength={160} onChange={e => setName(e.target.value)} /></label>
      <div className="space-y-2"><p className="text-sm text-muted-foreground">Date of Birth</p><IdentityDatePicker value={dob} onChange={setDob} /></div>
      {(["front", "selfie"] as const).map(slot => <div key={slot} className="space-y-2">
        <h4 className="font-semibold text-sm">{slot === "front" ? "Front of Government ID" : "Holding Photo / Selfie with ID and Note"}</h4>
        {slot === "selfie" && <p className="text-xs text-muted-foreground">Hold your ID next to your face with a handwritten note displaying 'Drop That Thing', today's date, and your username{username ? ` (${username})` : ""}. Today's date: {new Date().toISOString().slice(0, 10)}.</p>}
        <label className="block cursor-pointer border border-dashed border-border rounded-md p-4 focus-within:ring-2 focus-within:ring-ring" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); pick(slot, e.dataTransfer.files[0]); }}>
          {previews[slot] && <img src={previews[slot]} alt={slot === "front" ? "Selected government ID" : "Selected holding photo"} className="max-h-56 w-full object-contain mb-3" />}
          <span className="text-sm text-muted-foreground">Choose or drop an image · JPG, PNG, WebP · 10 MB maximum</span>
          <input aria-label={slot === "front" ? "Front of Government ID" : "Holding Selfie"} type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm mt-2" onChange={e => pick(slot, e.target.files?.[0])} />
        </label>
      </div>)}
      <Button variant="neon" className="w-full" disabled={busy} onClick={submit}>{busy ? "SUBMITTING…" : "SUBMIT FOR REVIEW"}</Button>
    </>}
    <p className="text-xs text-muted-foreground">Documents are private and accessible only to you and authorized DTT administrators.</p>
  </div>;
}
