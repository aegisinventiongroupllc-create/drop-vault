import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Subscription {
  id: string;
  customer_id: string;
  creator_id: string;
  creator_name: string | null;
  started_at: string;
  expires_at: string;
  autorenew: boolean;
  warned_24h: boolean;
  status: string;
  renewal_count: number;
}

export function useSubscriptions() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    setUserId(uid);
    if (!uid) { setSubs([]); setLoading(false); return; }
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("customer_id", uid)
      .order("expires_at", { ascending: true });
    setSubs((data ?? []) as Subscription[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("subscriptions-mine")
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  const setAutorenew = async (id: string, value: boolean) => {
    await supabase.from("subscriptions").update({ autorenew: value }).eq("id", id);
    await refresh();
  };

  return { subs, userId, loading, refresh, setAutorenew };
}
