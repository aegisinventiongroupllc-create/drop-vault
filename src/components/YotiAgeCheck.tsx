import { useEffect, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "none" | "pending" | "passed" | "failed";

const YotiAgeCheck = () => {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Only call the age-check service with a real signed-in session; otherwise it rejects the request.
  const hasSession = async () => {
    // getUser re-validates with the auth server, so stale or admin-only sessions are skipped.
    const { data, error } = await supabase.auth.getUser();
    return !error && Boolean(data.user?.id);
  };

  const check = async () => {
    try {
      if (!(await hasSession())) { setStatus("none"); return; }
      const { data, error: e } = await supabase.functions.invoke("yoti-age-check", { body: { action: "result" } });
      setStatus(e ? "none" : ((data?.status as Status) ?? "none"));
    } catch {
      setStatus("none");
    }
  };
  useEffect(() => { check(); }, []);

  const start = async () => {
    setStarting(true); setError(null);
    try {
      if (!(await hasSession())) { setError("Please sign in to your creator account to verify your age."); return; }
      const { data, error: e } = await supabase.functions.invoke("yoti-age-check", {
        body: { action: "start", return_url: window.location.href },
      });
      if (e || !data?.url) { setError("Couldn't start the age check. Please try again."); return; }
      window.location.href = data.url;
    } catch {
      setError("Couldn't start the age check. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <p className="text-sm font-bold tracking-wider text-foreground">QUICK 18+ AGE CHECK</p>
      </div>
      <p className="text-xs text-muted-foreground">Verified securely by Yoti. Takes about two minutes — a photo of your ID and a quick face scan.</p>
      {status === "loading" ? (
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      ) : status === "passed" ? (
        <p className="text-sm font-bold text-primary">AGE VERIFIED ✓</p>
      ) : (
        <>
          {status === "failed" && <p className="text-xs text-destructive">The last check didn't pass. You can try again.</p>}
          {status === "pending" && (
            <Button variant="outline" size="sm" className="w-full" onClick={check}>I FINISHED — CHECK MY RESULT</Button>
          )}
          <Button variant="neon" className="w-full" onClick={start} disabled={starting}>
            {starting ? "OPENING…" : "VERIFY MY AGE"}
          </Button>
        </>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default YotiAgeCheck;
