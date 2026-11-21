import { useState } from "react";
import { Button } from "@/components/ui/button";
import { creatorHandle, creatorShareUrl, saveCreatorLink } from "@/lib/creatorSharing";

export default function CreatorShareActions({ creatorName }: { creatorName: string }) {
  const [status, setStatus] = useState("");
  const handle = creatorHandle(creatorName);
  const url = creatorShareUrl(handle);
  if (!handle || !url) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setStatus("Creator link copied."); }
    catch { setStatus("Copy the creator address below, or save the link."); }
  };
  const share = async () => {
    if (!navigator.share) { await copy(); return; }
    try { await navigator.share({ title: `DTT · @${handle}`, text: `Find @${handle} on DTT · 18+ only`, url }); }
    catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setStatus("Sharing is unavailable. Copy or save the link instead."); }
  };
  return <section aria-label="Share creator library" className="space-y-3">
    <div className="flex flex-wrap justify-center gap-2">
      <Button variant="neon" onClick={() => void share()}>SHARE LIBRARY</Button>
      <Button variant="outline" onClick={() => void copy()}>COPY LINK</Button>
      <Button variant="outline" asChild><a href={`https://x.com/intent/post?text=${encodeURIComponent(`Find @${handle} on DTT · 18+ only`)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">POST ON X</a></Button>
      <Button variant="outline" onClick={() => saveCreatorLink(handle)}>SAVE CREATOR LINK</Button>
    </div>
    <p className="break-all text-center text-xs text-muted-foreground notranslate" translate="no">{url}</p>
    {status && <p role="status" className="text-center text-xs text-foreground">{status}</p>}
  </section>;
}