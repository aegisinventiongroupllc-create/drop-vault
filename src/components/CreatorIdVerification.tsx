import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import IdentityDatePicker from "@/components/IdentityDatePicker";
import { identityAge, validIdentityImage } from "@/lib/identityVerification";
import SelfieCamera from "@/components/SelfieCamera";
import { countryOptions } from "@/lib/countryOptions";
import { canContinueVerification, DTT_VERIFICATION_STEPS } from "@/lib/dttVerificationSteps";
import FaceReviewCapture from "./FaceReviewCapture";
import { validFaceReview } from "@/lib/faceReview";

const COUNTRIES = countryOptions();
type Status = "unsubmitted" | "pending" | "flagged" | "approved" | "rejected";
export default function CreatorIdVerification({ userId, onApproved, audience = "creator" }: { userId: string; onApproved?: () => void; audience?: "creator" | "customer" }) {
  const [status, setStatus] = useState<Status>("unsubmitted");
  const [notes, setNotes] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("");
  const [files, setFiles] = useState<{ front?: File; back?: File; selfie?: File }>({});
  const [previews, setPreviews] = useState<{ front?: string; back?: string; selfie?: string }>({});
  const [cameraOpen, setCameraOpen] = useState(false);
  const [faceVideo, setFaceVideo] = useState<File>();
  const [faceConsent, setFaceConsent] = useState(false);
  const [expires, setExpires] = useState("");
  const [documentType, setDocumentType] = useState("drivers_license");
  const [issuingCountry, setIssuingCountry] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [collectionReady, setCollectionReady] = useState(false);
  const initialized = useRef(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: profile, error: profileError } = await supabase.from("profiles").select("verification_status,verification_reviewer_notes,legal_first_name,legal_last_name,date_of_birth,display_name").eq("user_id", userId).maybeSingle();
      const review = audience === "customer" ? await supabase.from("dtt_identity_reviews").select("status,reviewer_notes,legal_first_name,legal_last_name,date_of_birth").eq("user_id", userId).eq("audience", "customer").order("submitted_at", { ascending: false }).limit(1).maybeSingle() : null;
      const { data: collection, error: collectionError } = await supabase.rpc("my_customer_age_collection_status");
      const audit = audience === "customer" ? await supabase.functions.invoke("customer-age-status", { body: {} }) : null;
      const error = profileError ?? review?.error;
      const data = profile ? { ...profile, ...(audience === "customer" ? { verification_status: review?.data?.status ?? "unsubmitted", verification_reviewer_notes: review?.data?.reviewer_notes ?? null, legal_first_name: review?.data?.legal_first_name ?? "", legal_last_name: review?.data?.legal_last_name ?? "", date_of_birth: review?.data?.date_of_birth ?? null } : {}) } : null;
      if (!active) return;
      setCollectionReady(!collectionError && collection && typeof collection === "object" && !Array.isArray(collection) && collection.collection_ready === true);
      if (audience === "customer" && !audit?.error && audit?.data?.decision) {
        const decision = audit.data.decision;
        setStatus(decision.status === "approved" && decision.expires_on >= new Date().toISOString().slice(0,10) ? "approved" : "rejected");
        setNotes(decision.status === "rejected" ? "Your age check was declined. Identity images and face video have been deleted." : null);
        setLoading(false); return;
      }
      if (error) toast.error("Could not load identity status");
      if (data) {
        setStatus(data.verification_status as Status); setNotes(data.verification_reviewer_notes);
        if (!initialized.current) {
          setName([data.legal_first_name, data.legal_last_name].filter(Boolean).join(" ")); setDob(data.date_of_birth ?? "");
          initialized.current = true;
        }
        setUsername(data.display_name ?? "");
      }
      setLoading(false);
    };
    void load();
    const timer = window.setInterval(load, 15000);
    window.addEventListener("focus", load);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", load); };
  }, [userId, audience]);
  useEffect(() => { if (status === "approved") onApproved?.(); }, [status, onApproved]);
  useEffect(() => {
    const next = { front: files.front ? URL.createObjectURL(files.front) : undefined, back: files.back ? URL.createObjectURL(files.back) : undefined, selfie: files.selfie ? URL.createObjectURL(files.selfie) : undefined };
    setPreviews(next);
    return () => { Object.values(next).forEach(url => { if (url) URL.revokeObjectURL(url); }); };
  }, [files]);
  const pick = (slot: "front" | "back" | "selfie", file?: File) => {
    if (!file) return;
    if (!validIdentityImage(file)) { toast.error("Choose a JPG, PNG or WebP image up to 10 MB."); return; }
    setFiles(current => ({ ...current, [slot]: file }));
  };
  const submit = async () => {
    if (!collectionReady) { toast.error("New identity submissions are paused while privacy safeguards are finalized."); return; }
    const age = identityAge(dob);
    if (name.trim().length < 2 || name.trim().length > 160 || age === null || age < 18 || !files.front || !files.back || !files.selfie || !validFaceReview(faceVideo) || !faceConsent || !expires || !/^[A-Z]{2}$/.test(issuingCountry) || !documentNumber.trim()) { toast.error("Complete the document details, three clear photos and private face check."); return; }
    setBusy(true);
    const uploaded: string[] = [];
    const documentBucket = audience === "creator" ? "creator-2257-records" : "dtt-identity-review";
    let facePath: string | undefined;
    try {
      for (const [slot, file] of [["front", files.front], ["back", files.back], ["selfie", files.selfie]] as const) {
        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const path = `${userId}/${crypto.randomUUID()}-${slot}.${ext}`;
        const { error } = await supabase.storage.from(documentBucket).upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw error;
        uploaded.push(path);
      }
      const [front, back, selfie] = uploaded;
      if (!front || !back || !selfie) throw new Error("Three photos are required.");
      if (!faceVideo) throw new Error("Face video required");
      facePath = `${userId}/${crypto.randomUUID()}-face.${faceVideo.type === "video/mp4" ? "mp4" : "webm"}`;
      const faceUpload = await supabase.storage.from("dtt-identity-review").upload(facePath, faceVideo, { upsert: false, contentType: faceVideo.type });
      if (faceUpload.error) throw faceUpload.error;
      const { error } = await supabase.rpc("submit_dtt_identity", { _audience: audience, _full_name: name.trim(), _dob: dob, _front: front, _back: back, _selfie: selfie, _face: facePath, _expires: expires, _type: documentType, _country: issuingCountry, _number: documentNumber.trim(), _consent: faceConsent });
      if (error) throw error;
      setStatus(expires < new Date().toISOString().slice(0,10) ? "flagged" : "pending"); setFiles({}); setFaceVideo(undefined); toast.success("Submitted for review");
    } catch (error) {
      if (uploaded.length) {
        const cleanup = await supabase.storage.from(documentBucket).remove(uploaded);
        if (cleanup.error) toast.error("Submission failed and photo cleanup could not finish. Contact DTT support.");
      }
      if (facePath) { const cleanup = await supabase.storage.from("dtt-identity-review").remove([facePath]); if (cleanup.error) toast.error("Face-video cleanup could not finish. Contact DTT support."); }
      toast.error("Submission failed", { description: error instanceof Error ? error.message : "Please try again." });
    } finally { setBusy(false); }
  };
  const details = { name, dob, expires, issuingCountry, documentNumber };
  const canContinue = canContinueVerification(step, details, files) && (step < 2 || (validFaceReview(faceVideo) && faceConsent));
  if (loading) return <p className="text-muted-foreground">Loading verification…</p>;
  if (status === "approved") return <div className="border border-success rounded-md p-4"><h3 className="font-bold text-success">DTT Age Verification · Approved</h3><p className="text-sm text-muted-foreground">{audience === "customer" ? "Your adult identity was approved by DTT. You can now join the customer waiting list and receive your ticket." : "Your documents were approved by DTT. Content uploads are available subject to account requirements."}</p></div>;
  if (!collectionReady && !["pending", "flagged"].includes(status)) return <section className="space-y-3 border-y border-border py-4"><h3 className="font-semibold">DTT Age Verification</h3><p className="text-sm text-muted-foreground">New identity submissions are paused while DTT finalizes private review and deletion safeguards. Please do not send ID photos by email.</p><Button variant="outline" onClick={() => window.dispatchEvent(new Event("focus"))}>CHECK AVAILABILITY</Button></section>;
  return <div className="space-y-4">
    <header className="space-y-2"><h3 className="font-semibold text-foreground">DTT Age Verification</h3><p className="text-sm text-muted-foreground">4 steps. Have a clear, current state ID, government photo ID or passport ready.</p><ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1"><li>Type your name and birthday exactly as on your ID</li><li>Photograph both sides of your ID; for a passport, use the photo-details page and signature page</li><li>Take a holding-ID photo with your dated DTT note, then record the guided face movements</li><li>Check everything and submit — DTT reviews it privately</li></ol></header>
    {status === "pending" || status === "flagged" ? <div className="text-gold"><p>{status === "flagged" ? "Your submission needs further review." : "Your submission is pending review."} {audience === "customer" ? "Your ticket becomes available after DTT approves your adult identity." : "Public publishing remains locked."}</p>{notes && <p className="whitespace-pre-wrap">{notes}</p>}<Button variant="outline" className="mt-3" onClick={() => window.dispatchEvent(new Event("focus"))}>CHECK REVIEW STATUS</Button></div> : <>
      {status === "rejected" && <div role="alert" className="border border-destructive rounded-md p-3 text-sm"><p className="font-bold text-destructive">Submission declined</p><p className="text-foreground whitespace-pre-wrap">{notes}</p></div>}
      <ol aria-label="Verification progress" className="grid grid-cols-2 gap-2 sm:grid-cols-4">{DTT_VERIFICATION_STEPS.map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined} className={`border-b-2 py-2 text-sm ${step === index ? "border-primary text-primary font-semibold" : "border-border text-muted-foreground"}`}>{index + 1}. {label}</li>)}</ol>
      <h4 className="font-semibold" tabIndex={-1}>Step {step + 1} · {DTT_VERIFICATION_STEPS[step]}</h4>
      {step === 0 && <div className="space-y-4">
      <label className="block text-sm text-muted-foreground">Full Legal Name<Input aria-label="Full Legal Name" value={name} maxLength={160} onChange={e => setName(e.target.value)} /></label>
      <div className="space-y-2"><p className="text-sm text-muted-foreground">Date of Birth</p><IdentityDatePicker value={dob} onChange={setDob} /><p className="text-xs text-muted-foreground">You must be 18 or older.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Document type<select aria-label="Document type" className="h-12 w-full rounded-md border border-border bg-secondary px-3 text-base" value={documentType} onChange={e => setDocumentType(e.target.value)}><option value="drivers_license">Driver's license</option><option value="passport">Passport</option><option value="national_id">National ID</option><option value="other">Other government ID</option></select></label>
        <label className="text-sm">Country on your ID<select aria-label="Country on your ID" className="h-12 w-full rounded-md border border-border bg-secondary px-3 text-base" value={issuingCountry} onChange={e => setIssuingCountry(e.target.value)}><option value="">Choose country</option>{COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
        <label className="text-sm">ID number<Input aria-label="Document number" placeholder="As printed on your ID" maxLength={100} value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} /></label>
        <div className="text-sm sm:col-span-2 space-y-1"><p>ID expiration date</p><IdentityDatePicker label="Expiration date" mode="expiry" value={expires} onChange={setExpires} /></div>
      </div>
      </div>}
      {(["front", "back", "selfie"] as const).filter(slot => step === 1 ? slot !== "selfie" : step === 2 ? slot === "selfie" : false).map(slot => <div key={slot} className="space-y-2">
        <h4 className="font-semibold text-sm">{slot === "front" ? "Front of Government ID" : slot === "back" ? "Back of Government ID" : "Holding Photo / Selfie with ID and Note"}</h4>
        {slot === "selfie" && <p className="text-xs text-muted-foreground">Hold your ID next to your face with a handwritten note displaying 'Drop That Thing', today's date, and your username{username ? ` (${username})` : ""}. Today's date: {new Date().toISOString().slice(0, 10)}.</p>}
        <label className="block cursor-pointer border border-dashed border-border rounded-md p-4 focus-within:ring-2 focus-within:ring-ring" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); pick(slot, e.dataTransfer.files[0]); }}>
          {previews[slot] && <img src={previews[slot]} alt={slot === "front" ? "Selected government ID front" : slot === "back" ? "Selected government ID back" : "Selected holding photo"} className="max-h-56 w-full object-contain mb-3" />}
          <span className="text-sm text-muted-foreground">Choose or drop an image · JPG, PNG, WebP · 10 MB maximum</span>
          <input aria-label={slot === "front" ? "Front of Government ID" : slot === "back" ? "Back of Government ID" : "Holding Selfie"} type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm mt-2" onChange={e => pick(slot, e.target.files?.[0])} />
        </label>
        {slot === "selfie" && <Button variant="outline" onClick={() => setCameraOpen(true)}>TAKE HOLDING-ID PHOTO</Button>}
      </div>)}
      {step === 2 && <FaceReviewCapture onCapture={(file, consent) => { setFaceVideo(file); setFaceConsent(consent); }} />}
      {step === 3 && <div className="space-y-4">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Full legal name</dt><dd className="break-words">{name}</dd></div><div><dt className="text-sm text-muted-foreground">Date of birth</dt><dd>{dob}</dd></div><div><dt className="text-sm text-muted-foreground">Document</dt><dd>{documentType.replace(/_/g, " ")} · {issuingCountry}</dd></div><div><dt className="text-sm text-muted-foreground">Expires</dt><dd>{expires}</dd></div></dl>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{(["front", "back", "selfie"] as const).map(slot => <figure key={slot}>{previews[slot] && <img src={previews[slot]} alt={`Review ${slot} photo`} className="h-40 w-full object-contain border border-border rounded-md" />}<figcaption className="text-sm text-muted-foreground mt-2">{slot === "front" ? "ID front" : slot === "back" ? "ID back" : "Holding photo"}</figcaption></figure>)}</div>
        {expires < new Date().toISOString().slice(0, 10) && <p role="alert" className="text-gold text-sm">This document has expired. Your submission will be flagged for further review.</p>}
        <p className="text-sm text-success">Private face-movement video included for human review.</p>
        <div className="border-y border-border py-3 space-y-1"><h5 className="font-semibold text-sm">DTT human review</h5><p className="text-sm text-muted-foreground">Your documents and silent face video are submitted privately to DTT. A reviewer checks readable ID details, age and face evidence before recording a decision. Head movements do not automatically prove identity or certified liveness. {audience === "creator" ? "Publishing also requires content-specific clearance for everyone shown." : "Approval allows a waiting-list ticket, not paid media access."}</p></div>
      </div>}
      {step === 0 && !canContinue && <p className="text-xs text-muted-foreground">Fill in every box above to continue.</p>}
      <div className="flex gap-3">{step > 0 && <Button variant="outline" disabled={busy} onClick={() => setStep(current => current - 1)}>BACK</Button>}{step < 3 ? <Button variant="neon" className="flex-1" disabled={!canContinue || busy} onClick={() => setStep(current => current + 1)}>CONTINUE</Button> : <Button variant="neon" className="flex-1" disabled={busy || !canContinue} onClick={submit}>{busy ? "SUBMITTING…" : "SUBMIT FOR DTT REVIEW"}</Button>}</div>
    </>}
    <p className="text-xs text-muted-foreground">Documents are private and accessible only to you and authorized DTT administrators.</p>
    <SelfieCamera open={cameraOpen} onOpenChange={setCameraOpen} onPhoto={file => pick("selfie",file)} title="Holding-ID Photo" description="Hold your ID and dated DTT note beside your face. This photo is retained privately for human ID review, not certified biometric liveness." />
  </div>;
}
