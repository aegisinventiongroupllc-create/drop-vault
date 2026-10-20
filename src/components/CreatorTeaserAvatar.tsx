import { useEffect, useRef, useState } from "react";
import { Minimize2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProfileAvatar from "@/components/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { teaserGateTime } from "@/lib/teaserGate";

/** Creator face that spins like a coin over their latest teaser; tap to watch full screen. */
export default function CreatorTeaserAvatar({ creatorId, creatorName, avatarConfig, photoPath, unlocked, unlocking, onUnlock, isMen }: {
  creatorId: string | null; creatorName: string; avatarConfig: unknown; photoPath: string | null;
  unlocked: boolean; unlocking: boolean; onUnlock: () => void; isMen?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [gate, setGate] = useState(false);
  const fullRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!creatorId) return;
    let cancel = false;
    (async () => {
      const { data } = await supabase.from("creator_media").select("storage_path")
        .eq("creator_id", creatorId).eq("bucket", "teasers").eq("media_type", "video")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!data?.storage_path) return;
      const { data: s } = await supabase.storage.from("teasers").createSignedUrl(data.storage_path, 3600);
      if (!cancel) setUrl(s?.signedUrl ?? null);
    })();
    return () => { cancel = true; };
  }, [creatorId]);

  useEffect(() => { if (unlocked && gate) { setGate(false); fullRef.current?.play().catch(() => {}); } }, [unlocked, gate]);

  const onTime = () => {
    const v = fullRef.current;
    if (!v || unlocked || gate) return;
    const stop = teaserGateTime(v.duration);
    if (stop !== null && v.currentTime >= stop) { v.pause(); setGate(true); }
  };

  return (
    <>
      <button type="button" onClick={() => url && setFull(true)} aria-label={url ? `Play @${creatorName} teaser` : `@${creatorName}`}
        className="relative h-28 w-28 rounded-full overflow-hidden border-4 border-background neon-glow">
        {url && <video src={url} muted autoPlay loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-70" />}
        <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: 600 }}>
          <div className="animate-[coin-spin_6s_ease-in-out_infinite]" style={{ transformStyle: "preserve-3d" }}>
            <ProfileAvatar config={avatarConfig} creatorPhotoPath={photoPath} label={creatorName} className="h-20 w-20" />
          </div>
        </div>
      </button>
      <style>{`@keyframes coin-spin{0%{transform:rotateY(0)}45%{transform:rotateY(1080deg)}100%{transform:rotateY(1080deg)}}`}</style>

      {full && url && (
        <div className="fixed inset-0 z-[130] bg-background flex items-center justify-center">
          <video ref={fullRef} src={url} autoPlay playsInline controls={unlocked} onTimeUpdate={onTime} className="h-full w-full object-contain" />
          <button onClick={() => { setFull(false); setGate(false); }} aria-label="Minimize"
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-background/70 backdrop-blur flex items-center justify-center text-foreground">
            <Minimize2 className="w-5 h-5" />
          </button>
          {gate && !unlocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/75 backdrop-blur-xl px-6 text-center">
              <ProfileAvatar config={avatarConfig} creatorPhotoPath={photoPath} label={creatorName} className="h-20 w-20" />
              <h3 className="font-display text-2xl font-bold tracking-wider text-foreground">
                UNLOCK {isMen ? "HIS" : "HER"} LIBRARY
              </h3>
              <p className="text-sm text-muted-foreground">Drop 1 Bit-Token to finish this teaser and open @{creatorName}'s full library for 14 days.</p>
              <Button variant="neon" size="lg" disabled={unlocking} onClick={onUnlock}>
                {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : `DROP 1 BIT-TOKEN — UNLOCK @${creatorName.toUpperCase()}`}
              </Button>
              <button className="text-xs text-muted-foreground underline" onClick={() => { setFull(false); setGate(false); }}>Not now</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
