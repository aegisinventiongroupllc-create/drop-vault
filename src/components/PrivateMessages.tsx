import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import TopFansSection from "@/components/TopFansSection";

const PrivateMessages = () => {
  const [threads, setThreads] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoading(false); return; }
      const { data, error: readError } = await supabase.from("fan_messages")
        .select("creator_id, created_at").eq("fan_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (readError) { setError(true); setLoading(false); return; }
      const ids = [...new Set((data ?? []).map((row) => row.creator_id))];
      if (ids.length) {
        const { data: profiles, error: profileError } = await supabase.from("public_profiles")
          .select("user_id, display_name").in("user_id", ids);
        if (cancelled) return;
        setError(Boolean(profileError));
        setThreads(ids.map((id) => ({ id, name: profiles?.find((p) => p.user_id === id)?.display_name || "Creator" })));
      }
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, []);
  const thread = threads.find((item) => item.id === selected);
  return (
    <div className="space-y-3">
      {loading ? <p className="text-sm text-muted-foreground">Loading messages…</p> : error ? (
        <p role="alert" className="text-sm text-destructive">Couldn't load conversations. Please try again.</p>
      ) : threads.length === 0 ? <p className="text-sm text-muted-foreground">No private conversations yet.</p> : threads.map((item) => (
        <Button key={item.id} variant={selected === item.id ? "neon" : "outline"}
          className="w-full justify-between" onClick={() => setSelected(item.id)}>
          <span className="truncate">@{item.name}</span><span className="text-xs">VIEW MESSAGES</span>
        </Button>
      ))}
      {thread && <TopFansSection key={thread.id} creatorId={thread.id} creatorName={thread.name} initiallyOpen />}
    </div>
  );
};
export default PrivateMessages;