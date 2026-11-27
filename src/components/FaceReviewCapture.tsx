import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FACE_REVIEW_SECONDS, faceReviewAt, validFaceReview } from "@/lib/faceReview";

export default function FaceReviewCapture({ onCapture }: { onCapture: (file: File | undefined, consent: boolean) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const frame = useRef<number>();
  const [consent, setConsent] = useState(false);
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const cleanup = () => {
    if (timer.current) clearInterval(timer.current);
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
  };
  useEffect(() => () => { if (recorder.current?.state === "recording") { recorder.current.onstop = null; recorder.current.stop(); } cleanup(); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const camera = async () => {
    setError(""); setPreview(""); onCapture(undefined, consent);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("This browser cannot record the face check. Try an up-to-date Chrome or Safari browser.");
      cleanup();
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 24 } }, audio: false });
      stream.current = next;
      if (!video.current) { cleanup(); return; }
      video.current.srcObject = next;
      await video.current.play();
      setReady(true);
    } catch (e) { cleanup(); setError(e instanceof Error ? e.message : "Camera unavailable. Allow camera access and retry."); }
  };
  const record = () => {
    const source = video.current;
    if (!source || !stream.current || !consent) return;
    setError(""); setElapsed(0); setRecording(true); onCapture(undefined, consent);
    const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 480;
    const context = canvas.getContext("2d");
    if (!context) { setError("Camera capture unavailable."); setRecording(false); return; }
    const draw = () => { context.drawImage(source, 0, 0, 640, 480); frame.current = requestAnimationFrame(draw); };
    draw();
    const mime = ["video/webm;codecs=vp8", "video/mp4", "video/webm"].find(type => MediaRecorder.isTypeSupported(type));
    if (!mime) { cleanup(); setRecording(false); setReady(false); setError("Recording is unsupported. Try another browser."); return; }
    try {
      const captured = canvas.captureStream(24);
      const r = new MediaRecorder(captured, { mimeType: mime, videoBitsPerSecond: 900000 });
      recorder.current = r;
      const chunks: Blob[] = []; let cancelled = false;
      r.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      const started = performance.now();
      r.onstop = () => {
        const duration = (performance.now() - started) / 1000;
        cleanup(); captured.getTracks().forEach(track => track.stop()); setRecording(false); setReady(false);
        if (cancelled || duration < FACE_REVIEW_SECONDS - .15) { setError("Capture was interrupted. Keep this screen open and try again."); return; }
        const type = mime.startsWith("video/mp4") ? "video/mp4" : "video/webm";
        const file = new File(chunks, `dtt-face-review.${type === "video/mp4" ? "mp4" : "webm"}`, { type });
        if (!validFaceReview(file)) { setError("Face video could not be saved. Please retry."); return; }
        setPreview(URL.createObjectURL(file)); onCapture(file, true);
      };
      r.onerror = () => { cancelled = true; if (r.state === "recording") r.stop(); };
      r.start(500);
      timer.current = setInterval(() => { const seconds = (performance.now() - started) / 1000; setElapsed(seconds); if (document.hidden || seconds >= FACE_REVIEW_SECONDS) { if (document.hidden) cancelled = true; if (timer.current) clearInterval(timer.current); if (r.state === "recording") r.stop(); } }, 100);
    } catch { cleanup(); setRecording(false); setReady(false); setError("Recording failed. Please retry."); }
  };
  const instruction = faceReviewAt(elapsed);
  return <section className="space-y-3 border-y border-border py-4" aria-label="Private face review">
    <h4 className="font-semibold">Face-movement check</h4>
    <p className="text-sm text-muted-foreground">Keep your face clearly visible: left for 3 seconds, right for 3 seconds, up for 2 seconds and down for 2 seconds. Turn gently and stop if uncomfortable.</p>
    <label className="flex items-start gap-3 text-sm"><Checkbox checked={consent} disabled={recording} onCheckedChange={value => { const next = value === true; setConsent(next); if (!next) { cleanup(); setReady(false); setPreview(""); onCapture(undefined, false); } }} /><span>I agree to a silent face video being stored privately with my ID for DTT’s human identity review. This is not automated face recognition or certified liveness.</span></label>
    <video ref={video} autoPlay muted playsInline className={ready || recording ? "aspect-[4/3] w-full rounded-md bg-secondary object-contain" : "hidden"} />
    {recording && <p role="status" className="text-center text-lg font-semibold text-primary">{instruction?.label ?? "Finishing…"} · {instruction?.remaining ?? 0}s</p>}
    {preview && <><video src={preview} controls playsInline className="aspect-[4/3] w-full rounded-md bg-secondary object-contain" /><p className="text-sm text-success">Video ready for human review. Submission is not approval.</p></>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!consent || recording} onClick={() => void camera()}>{preview ? "RETAKE FACE VIDEO" : "OPEN FACE CAMERA"}</Button>{ready && <Button disabled={recording || !consent} onClick={record}>START FACE CHECK</Button>}</div>
  </section>;
}