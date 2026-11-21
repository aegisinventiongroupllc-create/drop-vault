import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import GalaxyReel from "@/components/GalaxyReel";
import MiniGlobe from "@/components/MiniGlobe";
import { createLockScreenImage, saveLockScreenImage } from "@/lib/lockScreenImage";
import { createLockScreenVideo } from "@/lib/lockScreenVideo";
import { loadTheme, resolveIdleSky, GlobeOverrideContext } from "@/lib/userTheme";
import { ENTRY_GLOBE } from "@/components/EntryPassGlobe";

export default function LockScreenWallpaper() {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(Date.now);
  const [theme, setTheme] = useState(loadTheme);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [video, setVideo] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const recordingAbort = useRef<AbortController | null>(null);
  const scene = useRef<HTMLDivElement>(null);
  const sky = resolveIdleSky(theme);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setBlob(null); setError("");
    const timer = window.setTimeout(() => {
      if (!scene.current) return;
      void createLockScreenImage(scene.current).then(image => { if (active) setBlob(image); })
        .catch(() => { if (active) setError("Your wallpaper couldn’t load. Please retry."); });
    }, 2000);
    return () => { active = false; window.clearTimeout(timer); };
  }, [open, attempt, snapshot]);
  useEffect(() => () => recordingAbort.current?.abort(), []);
  useEffect(() => {
    if (!video) { setVideoUrl(""); return; }
    const url = URL.createObjectURL(video);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [video]);
  const prepareVideo = async () => {
    if (!scene.current) return;
    const controller = new AbortController();
    recordingAbort.current = controller;
    setRecording(true); setError(""); setProgress(0);
    try { setVideo(await createLockScreenVideo(scene.current, controller.signal, setProgress)); }
    catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Video couldn’t be saved. Please retry."); }
    finally { setRecording(false); }
  };
  return <>
    <Button variant="outline" type="button" className="h-auto min-h-11 w-full whitespace-normal text-xs" onClick={() => { setTheme(loadTheme()); setSnapshot(Date.now()); setVideo(null); setOpen(true); }}>ADD TO LOCK SCREEN</Button>
    <Dialog open={open} onOpenChange={value => { if (!value) recordingAbort.current?.abort(); setOpen(value); }}>
      <DialogContent data-idle-interactive className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-sm flex-col overflow-y-auto [&>*]:shrink-0">
        <DialogTitle>My DTT lock screen</DialogTitle>
        <DialogDescription>Galaxy S25: save the silent video, then open Gallery, select it and choose Set as wallpaper → Lock screen. Other phones can use the still image; video support varies. Only your galaxy and globe are included.</DialogDescription>
        <div ref={scene} aria-label="Lock-screen artwork" className="relative isolate mx-auto aspect-[9/19.5] w-full max-w-[252px] shrink-0 overflow-hidden bg-background">
          <GalaxyReel scope="brb" styleOverride={sky.style} toneOverride={sky.tone ?? (theme.brbStyle || theme.starStyle ? "" : ENTRY_GLOBE.tone)} />
          <div className="absolute inset-0 bg-background/25" />
          <div className="absolute inset-0 flex items-center justify-center px-4" data-wallpaper-globe>
            <GlobeOverrideContext.Provider value={{ tone: theme.globe ?? ENTRY_GLOBE.tone, borderTone: theme.globeBorder ?? ENTRY_GLOBE.borderTone, whiteLights: true }}>
              <MiniGlobe size={180} speed={0.15} lights backdrop={false} cameraDistance={3.8} exportable />
            </GlobeOverrideContext.Provider>
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="button" disabled={recording || (!blob && !error)} variant="outline" onClick={() => {
          if (error) { setAttempt(n => n + 1); return; }
          if (blob) void saveLockScreenImage(blob).catch(() => setError("Your image couldn’t be saved. Please retry."));
        }}>{error ? "RETRY WALLPAPER" : blob ? "SAVE WALLPAPER IMAGE" : "PREPARING WALLPAPER…"}</Button>
        <Button type="button" disabled={recording || !blob} onClick={() => {
          if (video) void saveLockScreenImage(video).catch(() => setError("Your video couldn’t be saved. Please retry."));
          else void prepareVideo();
        }}>{recording ? `PREPARING VIDEO · ${progress}%` : video ? "SAVE SPINNING VIDEO" : "CREATE SPINNING VIDEO"}</Button>
        {recording && <Button variant="ghost" onClick={() => recordingAbort.current?.abort()}>CANCEL</Button>}
        {videoUrl && <video src={videoUrl} controls muted playsInline className="mx-auto w-28" aria-label="Spinning wallpaper video" />}
      </DialogContent>
    </Dialog>
  </>;
}