import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type SecurityEvent = { id: string; created_at: string; event_type: string; source: string; outcome: string };
const PAGE_SIZE = 25;

export default function AdminSecurityEvents() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const load = useCallback(async () => {
    setBusy(true); setError(""); setEvents([]); setCheckedAt(null); setHasNext(false);
    try {
      const { data: { user }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !user) throw new Error("Sign in with an administrator account to view security alerts.");
      const { data: admin, error: roleError } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (roleError || admin !== true) throw new Error("Administrator account required.");
      const { data, error: failure } = await supabase.from("security_access_events")
        .select("id,created_at,event_type,source,outcome")
        .order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (failure) throw new Error("Security alerts could not be loaded. Please retry.");
      setEvents((data ?? []).slice(0, PAGE_SIZE));
      setHasNext((data?.length ?? 0) > PAGE_SIZE); setCheckedAt(new Date().toLocaleString());
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Security alerts unavailable."); }
    finally { setBusy(false); }
  }, [page]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        setEvents([]); setCheckedAt(null); setError("Account changed. Refresh to verify administrator access.");
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  return <section className="px-4 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display font-bold text-foreground">SECURITY</h2>
      <Button variant="outline" disabled={busy} onClick={() => void load()}>REFRESH</Button>
    </div>
    {busy && <p role="status" className="text-sm text-muted-foreground">Checking security alerts…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {checkedAt && <p className="text-xs text-muted-foreground">Last checked: {checkedAt}</p>}
    {!busy && !error && checkedAt && events.length === 0 && <p className="text-sm text-muted-foreground">No recorded access denials on this page. This is not proof that no intrusion occurred.</p>}
    <div className="divide-y divide-border">
      {events.map(event => <article key={event.id} className="py-3 space-y-1">
        <p className="text-sm text-foreground">{event.event_type === "admin_code_rejected" ? "Administrator access code rejected" : "Private identity-record access denied"}</p>
        <p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()} · {event.source} · Blocked</p>
      </article>)}
    </div>
    {!error && checkedAt && <div className="flex gap-3">
      <Button variant="outline" disabled={busy || page === 0} onClick={() => setPage(p => p - 1)}>PREVIOUS</Button>
      <Button variant="outline" disabled={busy || !hasNext} onClick={() => setPage(p => p + 1)}>NEXT</Button>
    </div>}
    <p className="text-xs text-muted-foreground">Wrong codes can be mistakes, not necessarily attacks. Coverage: administrator code checks and private identity-record access denials only. External hosting incidents, ordinary login failures and content copying are not detected here.</p>
  </section>;
}