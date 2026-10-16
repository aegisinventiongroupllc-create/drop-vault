import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleHeart, useHeartTotal, useMyHearts } from "@/hooks/useHearts";
import { toast } from "@/hooks/use-toast";

export default function CreatorHeartButton({ creatorId }: { creatorId: string }) {
  const { hearts, refresh } = useMyHearts();
  const count = useHeartTotal(creatorId);
  const saved = hearts.some((heart) => heart.creator_id === creatorId);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const liked = optimistic ?? saved;
  return <Button variant="ghost" aria-label={liked ? "Unsave creator" : "Save creator"} aria-pressed={liked} disabled={busy} className="gap-2 text-primary" onClick={async (event) => {
    event.stopPropagation();
    setBusy(true); setOptimistic(!saved);
    const next = await toggleHeart(creatorId, saved);
    if (next !== null) await refresh();
    setOptimistic(null); setBusy(false);
    if (next === null) toast({ title: "Couldn't save creator", description: "Please sign in and try again.", variant: "destructive" });
  }}>
    <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
    <span className="tabular-nums">{count.toLocaleString()}</span>
  </Button>;
}