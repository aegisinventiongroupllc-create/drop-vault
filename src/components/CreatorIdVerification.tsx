import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Camera, CheckCircle, Clock, AlertCircle, Loader2, Upload, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLog";

type Slot = "id_front" | "id_back" | "selfie";
type Status = "unsubmitted" | "pending" | "approved" | "rejected";

const SLOT_META: Record<Slot, { title: string; hint: string }> = {
  id_front: { title: "Government ID — FRONT", hint: "Clear photo of the front of your driver's license, state ID, or passport photo page." },
  id_back:  { title: "Government ID — BACK / Passport page", hint: "Back of ID. For a passport, retake the photo page here." },
  selfie:   { title: "Verification Selfie", hint: "Hold your ID next to your face AND a handwritten note with TODAY'S date and the word 'DTT'." },
};

interface Props {
  userId: string;
  onApproved?: () => void;
}

const CreatorIdVerification = ({ userId, onApproved }: Props) => {
  const [status, setStatus] = useState<Status>("unsubmitted");
  const [reviewerNotes, setReviewerNotes] = useState<string | null>(null);
  const [legalFirst, setLegalFirst] = useState("");
  const [legalLast, setLegalLast] = useState("");
  const [dob, setDob] = useState("");
  const [previews, setPreviews] = useState<Record<Slot, string | null>>({ id_front: null, id_back: null, selfie: null });
  const [files, setFiles] = useState<Record<Slot, File | null>>({ id_front: null, id_back: null, selfie: null });
  const [activeCamera, setActiveCamera] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRefs = {
    id_front: useRef<HTMLInputElement>(null),
    id_back: useRef<HTMLInputElement>(null),
    selfie: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("verification_status, verification_reviewer_notes, legal_first_name, legal_last_name, date_of_birth")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        setStatus((data.verification_status as Status) || "unsubmitted");
        setReviewerNotes(data.verification_reviewer_notes ?? null);
        setLegalFirst(data.legal_first_name ?? "");
        setLegalLast(data.legal_last_name ?? "");
        setDob(data.date_of_birth ?? "");
        if (data.verification_status === "approved") onApproved?.();
      }
      setLoading(false);
    })();
  }, [userId, onApproved]);

  // ---- Camera ----
  const openCamera = async (slot: Slot) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: slot === "selfie" ? "user" : "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setActiveCamera(slot);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (err: any) {
      toast.error("Camera unavailable", { description: err?.message || "Use the upload option instead." });
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActiveCamera(null);
  };

  const capture = () => {
    if (!videoRef.current || !activeCamera) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `${activeCamera}.jpg`, { type: "image/jpeg" });
      setFiles((p) => ({ ...p, [activeCamera!]: file }));
      setPreviews((p) => ({ ...p, [activeCamera!]: URL.createObjectURL(blob) }));
      closeCamera();
    }, "image/jpeg", 0.92);
  };

  const onFilePick = (slot: Slot) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please pick an image file");
      return;
    }
    setFiles((p) => ({ ...p, [slot]: f }));
    setPreviews((p) => ({ ...p, [slot]: URL.createObjectURL(f) }));
  };

  // ---- Submit ----
  const validate = () => {
    if (!legalFirst.trim() || !legalLast.trim()) return "Enter your legal first and last name.";
    if (!dob) return "Enter your date of birth.";
    const age = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (Number.isNaN(age) || age < 18) return "You must be 18 or older.";
    if (age > 110) return "Date of birth looks invalid.";
    if (!files.id_front || !files.id_back || !files.selfie) return "Add all three photos.";
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSubmitting(true);
    try {
      const stamp = Date.now();
      const paths: Record<Slot, string> = { id_front: "", id_back: "", selfie: "" };
      for (const slot of ["id_front", "id_back", "selfie"] as Slot[]) {
        const file = files[slot]!;
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${userId}/${stamp}_${slot}.${ext}`;
        const { error } = await supabase.storage.from("id-verifications").upload(path, file, {
          cacheControl: "3600", upsert: true, contentType: file.type,
        });
        if (error) throw error;
        paths[slot] = path;
      }

      const { error: insErr } = await supabase.from("creator_verifications").insert({
        user_id: userId,
        legal_first_name: legalFirst.trim(),
        legal_last_name: legalLast.trim(),
        date_of_birth: dob,
        id_front_path: paths.id_front,
        id_back_path: paths.id_back,
        selfie_path: paths.selfie,
        status: "pending",
      });
      if (insErr) throw insErr;

      await supabase.from("profiles").update({
        verification_status: "pending",
        verification_submitted_at: new Date().toISOString(),
        legal_first_name: legalFirst.trim(),
        legal_last_name: legalLast.trim(),
        date_of_birth: dob,
      }).eq("user_id", userId);

      logActivity("id_verification_submitted", "Creator submitted ID verification");
      setStatus("pending");
      toast.success("Submitted for review", { description: "We'll review within 24 hours." });
    } catch (e: any) {
      toast.error("Submission failed", { description: e?.message || "Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  // ---- Status banners ----
  if (status === "approved") {
    return (
      <div className="bg-card border border-green-500/40 rounded-xl p-5 text-center">
        <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
        <h3 className="text-lg font-bold text-foreground">Identity Verified ✓</h3>
        <p className="text-xs text-muted-foreground mt-1">You're approved. You can upload content.</p>
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="bg-card border border-gold/40 rounded-xl p-5 text-center">
        <Clock className="w-10 h-10 text-gold mx-auto mb-2" />
        <h3 className="text-lg font-bold text-foreground">Under Review</h3>
        <p className="text-xs text-muted-foreground mt-1">An admin is reviewing your submission. This usually takes under 24 hours.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {status === "rejected" && (
        <div className="bg-destructive/10 border border-destructive/40 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-destructive">Previous submission rejected</p>
            {reviewerNotes && <p className="text-muted-foreground mt-1">{reviewerNotes}</p>}
            <p className="text-muted-foreground mt-1">Please re-submit with the corrections above.</p>
          </div>
        </div>
      )}

      {/* Legal name + DOB */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h4 className="text-sm font-bold tracking-wider text-foreground">LEGAL NAME (must match ID)</h4>
        <div className="grid grid-cols-2 gap-2">
          <input value={legalFirst} onChange={(e) => setLegalFirst(e.target.value)} placeholder="First name"
            className="bg-secondary rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <input value={legalLast} onChange={(e) => setLegalLast(e.target.value)} placeholder="Last name"
            className="bg-secondary rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground tracking-wider">DATE OF BIRTH</label>
          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
            max={new Date(Date.now() - 18 * 365.25 * 86400000).toISOString().slice(0, 10)}
            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1" />
        </div>
      </div>

      {/* Three photo slots */}
      {(["id_front", "id_back", "selfie"] as Slot[]).map((slot) => (
        <div key={slot} className="bg-card border border-border rounded-xl p-4">
          <h4 className="text-sm font-bold text-foreground tracking-wider">{SLOT_META[slot].title}</h4>
          <p className="text-[11px] text-muted-foreground mt-1 mb-3">{SLOT_META[slot].hint}</p>

          {previews[slot] ? (
            <div className="space-y-2">
              <img src={previews[slot]!} alt={slot} className="w-full rounded-lg border border-border max-h-64 object-contain bg-black" />
              <Button variant="outline" size="sm" className="w-full" onClick={() => { setFiles((p) => ({ ...p, [slot]: null })); setPreviews((p) => ({ ...p, [slot]: null })); }}>
                <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Retake
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="neon" size="sm" onClick={() => openCamera(slot)}>
                <Camera className="w-4 h-4 mr-1.5" /> Camera
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRefs[slot].current?.click()}>
                <Upload className="w-4 h-4 mr-1.5" /> Upload
              </Button>
              <input ref={fileInputRefs[slot]} type="file" accept="image/*" capture={slot === "selfie" ? "user" : "environment"} className="hidden" onChange={onFilePick(slot)} />
            </div>
          )}
        </div>
      ))}

      <Button variant="neon" size="lg" className="w-full" disabled={submitting} onClick={submit}>
        {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> SUBMITTING…</> : "SUBMIT FOR REVIEW"}
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">
        Photos are stored privately and only visible to you and DTT compliance staff.
      </p>

      {/* Camera overlay */}
      {activeCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <video ref={videoRef} className="flex-1 w-full object-contain bg-black" playsInline muted />
          <div className="p-4 flex gap-3 bg-black border-t border-border">
            <Button variant="outline" className="flex-1" onClick={closeCamera}>Cancel</Button>
            <Button variant="neon" className="flex-1" onClick={capture}>
              <Camera className="w-4 h-4 mr-2" /> Capture
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorIdVerification;