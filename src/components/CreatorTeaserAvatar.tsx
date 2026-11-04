import { useCallback, useEffect, useRef, useState } from "react";
import PortraitCoinToss from "@/components/PortraitCoinToss";
import { createPortal } from "react-dom";
import { Minimize2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProfileAvatar from "@/components/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { teaserGateTime } from "@/lib/teaserGate";
import { isPlaybackInterruption } from "@/lib/teaserPlayback";
import "./creator-portrait.css";

/** Creator face that spins like a coin over their latest teaser; tap to watch full screen. */
export default function CreatorTeaserAvatar({ creatorId, creatorName, avatarConfig, photoPath, unlocked, unlocking, onUnlock, canUnlock = false, isMen, toss, audio, onSequenceComplete }: {
  creatorId: string | null; creatorName: string; avatarConfig: unknown; photoPath: string | null;
  unlocked: boolean; unlocking: boolean; onUnlock: () => void; canUnlock?: boolean; isMen?: boolean;
  toss?: { id: number; count: number; preview: boolean } | null; audio?: AudioContext | null; onSequenceComplete?: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [gate, setGate] = useState(false);
  const [failed, setFailed] = useState(false);
  const fullRef = useRef<HTMLVideoElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [tossing, setTossing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const resumeTime = useRef(0);
  useEffect(() => {
    if (!toss) return;
    resumeTime.current = fullRef.current?.currentTime ?? 0;
    fullRef.current?.pause();
    setFull(false); setGate(false); setTossing(true);
    sceneRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [toss]);
  const finishToss = useCallback(() => {
    setTossing(false);
    if (toss?.preview) return;
    if (url) { setFinishing(true); setFull(true); }
    else onSequenceComplete?.();
  }, [toss, url, onSequenceComplete]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false));
    observer.observe(scene);
    const onVisibility = () => setPageVisible(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  useEffect(() => {
    setUrl(null); setFull(false); setGate(false); setFailed(false);
    if (!creatorId) return;
    let cancel = false;
    (async () => {
      const { data } = await supabase.rpc("get_active_teasers");
      const selected = data?.find(item => item.creator_id === creatorId);
      if (!selected?.storage_path || selected.media_type !== "video") return;
      const { data: s } = await supabase.storage.from("teasers").createSignedUrl(selected.storage_path, 3600);
      if (!cancel) setUrl(s?.signedUrl ?? null);
    })();
    return () => { cancel = true; };
  }, [creatorId]);

  useEffect(() => { if (unlocked && gate && !tossing) { setGate(false); fullRef.current?.play().catch(() => {}); } }, [unlocked, gate, tossing]);

  const onTime = () => {
    const v = fullRef.current;
    if (!v || unlocked || gate) return;
    const stop = teaserGateTime(v.duration);
    if (stop !== null && v.currentTime >= stop) { v.pause(); setGate(true); }
  };

  return (
    <>
      <div className="relative shrink-0">
      <Button variant="ghost" type="button" disabled={tossing} onClick={() => url && setFull(true)} aria-label={url ? `Play @${creatorName} teaser` : `@${creatorName}`}
        className="relative h-40 w-40 sm:h-48 sm:w-48 shrink-0 p-0 rounded-full overflow-hidden border-4 border-background neon-glow">
        <div ref={sceneRef} data-paused={!visible || !pageVisible || full} className="creator-coin-scene absolute inset-0 flex items-center justify-center">
          <div className="creator-coin">
            <div className="creator-coin-face"><ProfileAvatar config={avatarConfig} creatorPhotoPath={photoPath} label={creatorName} className="h-full w-full" /></div>
            <div className="creator-coin-face creator-coin-back bg-secondary">
              {url ? <video src={`${url}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" aria-label="Teaser preview" /> : <ProfileAvatar config={avatarConfig} creatorPhotoPath={photoPath} label={creatorName} className="h-full w-full" />}
            </div>
          </div>
        </div>
      </Button>
      {tossing && toss && <PortraitCoinToss key={toss.id} count={toss.count} audio={audio ?? null} onComplete={finishToss} />}
      </div>

      {full && url && createPortal(
        <div className="fixed inset-0 z-[130] bg-background flex items-center justify-center">
          <video ref={fullRef} src={url} playsInline controls={unlocked} onLoadedData={() => { const video = fullRef.current; if (!video) return; if (finishing) video.currentTime = resumeTime.current; void video.play().catch(e => { if (!isPlaybackInterruption(e)) setFailed(true); }); }} onEnded={() => { if (finishing) { setFull(false); setFinishing(false); onSequenceComplete?.(); } }} onError={() => setFailed(true)} onTimeUpdate={onTime} className="h-full w-full object-contain" />
          <Button variant="ghost" onClick={() => { setFull(false); setGate(false); if (finishing) { setFinishing(false); onSequenceComplete?.(); } }} aria-label="Minimize"
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-background/70 backdrop-blur flex items-center justify-center text-foreground">
            <Minimize2 className="w-5 h-5" />
          </Button>
          {failed && <div role="alert" className="absolute inset-x-0 bottom-10 p-6 bg-background/90 text-center text-muted-foreground">This browser couldn't play the teaser. Try a browser that supports MP4 video.</div>}
          {gate && !unlocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/75 backdrop-blur-xl px-6 text-center">
              <ProfileAvatar config={avatarConfig} creatorPhotoPath={photoPath} label={creatorName} className="h-20 w-20" />
              <h3 className="font-display text-2xl font-bold tracking-wider text-foreground">
                UNLOCK {isMen ? "HIS" : "HER"} LIBRARY
              </h3>
              <p className="text-sm text-muted-foreground">{canUnlock ? `Drop 1 Bit-Token to finish this teaser and open @${creatorName}'s full library for 14 days.` : "Library coming soon. Paid unlocks are not available."}</p>
              <Button variant="neon" size="lg" disabled={unlocking || !canUnlock} onClick={onUnlock}>
                {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : `DROP 1 BIT-TOKEN — UNLOCK @${creatorName.toUpperCase()}`}
              </Button>
              <button className="text-xs text-muted-foreground underline" onClick={() => { setFull(false); setGate(false); }}>Not now</button>
            </div>
          )}
        </div>, document.body
      )}
    </>
  );
}
