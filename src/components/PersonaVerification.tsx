import { useCallback, useEffect, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function PersonaVerification() {
  const [status, setStatus] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useCallback(async (action: "start" | "status") => {
    const { data, error: failure } = await supabase.functions.invoke("persona-verification", { body: { action } });
    if (failure) {
      const details = failure instanceof FunctionsHttpError ? await failure.context.json().catch(() => null) : null;
      throw new Error(details?.error ?? "Could not reach Persona. Please try again.");
    }
    if (!data || typeof data.status !== "string") throw new Error("Could not load Persona status.");
    setStatus(data.status);
    return data as { status: string; verificationUrl?: string };
  }, []);
  const refresh = useCallback(async () => {
    setBusy(true); setError("");
    try { await request("status"); } catch (failure) { setStatus("unavailable"); setError(failure instanceof Error ? failure.message : "Could not check verification."); }
    finally { setBusy(false); }
  }, [request]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);
  const start = async () => {
    const popup = window.open("about:blank", "dtt-persona", "width=600,height=800");
    if (!popup) { setError("Allow pop-ups to open Persona verification."); return; }
    popup.opener = null;
    setBusy(true); setError("");
    try {
      const result = await request("start");
      if (result.verificationUrl) popup.location.replace(result.verificationUrl);
      else popup.close();
    } catch (failure) { popup.close(); setError(failure instanceof Error ? failure.message : "Could not open Persona."); }
    finally { setBusy(false); }
  };
  const complete = ["completed", "approved", "declined", "failed", "expired", "needs_review"].includes(status);
  return <section className="space-y-3 border-y border-border py-4" aria-label="Persona identity test">
    <h3 className="font-semibold text-foreground">Persona · Sandbox test</h3>
    <p className="text-sm text-muted-foreground">Persona collects the documents and selfie for this test. Sandbox results do not approve your DTT account or unlock publishing. DTT’s private review remains required.</p>
    <p className="text-sm text-foreground" role="status">{status === "loading" ? "Checking connection…" : status === "unavailable" ? "Verification unavailable" : status === "not_started" ? "Ready to test" : `Test status: ${status.replace(/_/g, " ")}`}</p>
    {error && <p role="alert" className="text-sm text-destructive break-words">{error}</p>}
    <div className="flex flex-wrap gap-3">
      {!complete && <Button variant="neon" disabled={busy || status === "loading" || status === "unavailable"} onClick={start}>{busy ? "PLEASE WAIT…" : status === "pending" || status === "created" ? "CONTINUE PERSONA TEST" : "TRY PERSONA VERIFICATION"}</Button>}
      <Button variant="outline" disabled={busy} onClick={refresh}>CHECK TEST STATUS</Button>
    </div>
  </section>;
}