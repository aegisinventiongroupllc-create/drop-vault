import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTokenBalance() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) { setBalance(0); setLoading(false); return; }
    const { data } = await supabase
      .from("token_balances")
      .select("balance")
      .eq("user_id", uid)
      .maybeSingle();
    setBalance(data?.balance ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("token-balance-mine")
      .on("postgres_changes", { event: "*", schema: "public", table: "token_balances" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  return { balance, loading, refresh };
}