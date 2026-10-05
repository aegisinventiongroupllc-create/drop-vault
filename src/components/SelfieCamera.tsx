import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export default function SelfieCamera({ open, onOpenChange, onPhoto }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhoto: (file: File) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const stream = useRef<MediaStream>();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [capturing, setCapturing] = useState(false);
  const stop = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = undefined;
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReady(false);
    setError("");
    setCapturing(false);
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera unavailable");
        const camera = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 960 } },
        });
        if (cancelled) { camera.getTracks().forEach((track) => track.stop()); return; }
        stream.current = camera;
        if (video.current) {
          video.current.srcObject = camera;
          await video.current.play();
        }
      } catch {
        if (!cancelled) { stop(); setError("Allow camera access, or choose a photo instead."); }
      }
    })();
    return () => { cancelled = true; stop(); };
  }, [open]);

  const accept = (file: File) => {
    stop();
    onOpenChange(false);
    onPhoto(file);
  };
  const capture = async () => {
    const element = video.current;
    if (!element?.videoWidth || !element.videoHeight) return;
    setCapturing(true);
    try {
      const scale = Math.min(1, 1280 / Math.max(element.videoWidth, element.videoHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(element.videoWidth * scale);
      canvas.height = Math.round(element.videoHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Photo capture is unavailable.");
      context.drawImage(element, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) throw new Error("Couldn't capture your photo. Choose a photo instead.");
      accept(new File([blob], "selfie.jpg", { type: "image/jpeg" }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Couldn't capture your photo.");
    } finally { setCapturing(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg">
      <DialogTitle>Snap Your Face for Emoji</DialogTitle>
      <DialogDescription>Your photo is used only to create your emoji.</DialogDescription>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        <video ref={video} autoPlay muted playsInline onLoadedData={() => setReady(true)} className="h-full w-full object-contain -scale-x-100" aria-label="Live selfie camera" />
        {!ready && !error && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="button" disabled={!ready || capturing} onClick={() => void capture()}><Camera className="mr-2 h-4 w-4" />{capturing ? "Capturing…" : "Take Photo"}</Button>
      <Button type="button" variant="outline" disabled={capturing} onClick={() => input.current?.click()}><Upload className="mr-2 h-4 w-4" />Choose a Photo</Button>
      <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) accept(file);
      }} />
    </DialogContent>
  </Dialog>;
}