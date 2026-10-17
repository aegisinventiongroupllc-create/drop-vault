import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { watermarkCreatorMedia } from "@/lib/mediaWatermark";
import { canStageRequest, requestAccessActive, requestVideoLinkSeconds, REQUEST_RENEWAL_TOKENS } from "@/lib/requestDelivery";
import type { CustomRequestRow } from "@/hooks/useCustomRequests";

export default function RequestDelivery({ request, role, onChange }: { request: CustomRequestRow; role: "creator" | "customer"; onChange: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [video, setVideo] = useState<string | null>(null);
  const [, tick] = useState(0);
  const active = requestAccessActive(request.delivery_access_until);
  useEffect(() => {
    if (role !== "customer" || !request.delivery_access_until) return;
    const timer = window.setInterval(() => { tick((v) => v + 1); if (!requestAccessActive(request.delivery_access_until)) setVideo(null); }, 1000);
    return () => window.clearInterval(timer);
  }, [request.delivery_access_until, role]);

  const upload = async (file: File) => {
    if (!file.type.startsWith("video/")) { toast({ title: "Choose a video", variant: "destructive" }); return; }
    setBusy(true);
    let stagedPath: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in to upload.");
      const branded = await watermarkCreatorMedia(file, (message, percent) => setProgress(`${message} ${percent}%`));
      stagedPath = `${user.id}/${request.id}/${crypto.randomUUID()}.${branded.name.split(".").pop() || "mp4"}`;
      setProgress("Saving private request video…");
      const { error } = await supabase.storage.from("request-deliveries").upload(stagedPath, branded, { contentType: branded.type, upsert: false });
      if (error) throw error;
      const result = await supabase.rpc("attach_request_delivery", { _request_id: request.id, _path: stagedPath });
      if (result.error) throw result.error;
      stagedPath = null;
      toast({ title: request.status === "paid" ? "Request delivered — 14-day access started" : "Video saved — waiting for confirmed payment" });
      onChange();
    } catch (error) {
      if (stagedPath) await supabase.storage.from("request-deliveries").remove([stagedPath]);
      toast({ title: "Upload not completed", description: error instanceof Error ? error.message : String((error as { message?: string }).message || error), variant: "destructive" });
    } finally { setBusy(false); setProgress(""); if (input.current) input.current.value = ""; }
  };

  const watch = async () => {
    if (!request.delivery_path) return;
    const seconds = role === "creator" ? 60 : requestVideoLinkSeconds(request.delivery_access_until);
    if (!seconds) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("request-delivery-media", { body: { request_id: request.id } });
    setBusy(false);
    if (error) { toast({ title: "Video unavailable", description: error.message, variant: "destructive" }); return; }
    if (typeof data?.url === "string") setVideo(data.url);
  };

  const action = async (kind: "archive" | "renew") => {
    if (kind === "archive" && !window.confirm("Clear this request from your workspace? The customer's retained video will stay available.")) return;
    setBusy(true);
    const { error } = kind === "archive"
      ? await supabase.rpc("archive_request_delivery", { _request_id: request.id })
      : await supabase.rpc("renew_request_delivery", { _request_id: request.id });
    setBusy(false);
    if (error) { toast({ title: "Couldn't complete this action", description: error.message === "INSUFFICIENT_TOKENS" ? "Fill your vault to renew access." : error.message, variant: "destructive" }); return; }
    toast({ title: kind === "archive" ? "Cleared — customer copy retained" : "14-day access renewed" });
    onChange();
  };

  if (role === "creator" && canStageRequest(request.status, request.delivery_path)) return (
    <div className="mt-3 border border-dashed border-primary/40 rounded-lg p-3 space-y-2">
      <input ref={input} type="file" accept="video/*" aria-label="Request video" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }} />
      <Button variant="neon" className="w-full whitespace-normal" disabled={busy} onClick={() => input.current?.click()}>UPLOAD REQUEST VIDEO</Button>
      <p className="text-xs text-muted-foreground" role="status">{progress || (request.status === "accepted" ? "Private draft — customer access starts only after confirmed payment." : "Customer receives 14 days of private access on delivery.")}</p>
    </div>
  );
  if (!request.delivery_path) return null;
  return <div className="mt-3 space-y-2">
    <p className="text-xs text-muted-foreground">{role === "creator" && request.status !== "completed" ? "Video ready — awaiting confirmed payment" : active ? `Access until ${new Date(request.delivery_access_until || "").toLocaleString()}` : "14-day access expired"}</p>
    <div className="flex flex-wrap gap-2">
      {(role === "creator" || active) && <Button variant="outline" size="sm" disabled={busy} onClick={() => void watch()}>WATCH REQUEST</Button>}
      {role === "customer" && request.status === "completed" && !active && <Button variant="neon" size="sm" disabled={busy} onClick={() => void action("renew")}>RENEW 14 DAYS — {REQUEST_RENEWAL_TOKENS} BT</Button>}
      {role === "creator" && request.status === "completed" && <Button variant="outline" size="sm" disabled={busy} onClick={() => void action("archive")}>CLEAR FROM MY WORKSPACE</Button>}
    </div>
    {video && <video src={video} controls autoPlay playsInline controlsList="nodownload" className="w-full aspect-video rounded-lg bg-background" onError={() => { setVideo(null); toast({ title: "Video playback failed. Try opening it again.", variant: "destructive" }); }} />}
  </div>;
}