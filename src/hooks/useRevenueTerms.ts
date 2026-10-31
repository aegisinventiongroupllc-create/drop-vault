import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
export function useRevenueTerms(creatorId: string | null) {
  const [terms, setTerms] = useState<{ vault: number; request: number; expires: number | null; pass: string; loading: boolean }>({ vault: 90, request: 85, expires: null, pass: "NONE", loading: true });
  useEffect(() => {
    let cancelled = false;
    if (!creatorId) { setTerms({ vault: 90, request: 85, expires: null, pass: "NONE", loading: false }); return; }
    const load = async () => {
      const { data, error } = await supabase.rpc("get_my_revenue_terms");
      if (cancelled || error || !data || typeof data !== "object" || Array.isArray(data)) return;
      const expires = typeof data.power_week_expires_at === "string" ? Date.parse(data.power_week_expires_at) : null;
      setTerms({ vault: Number(data.vault_percent), request: Number(data.request_percent), expires, pass: String(data.vip_pass), loading: false });
    };
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [creatorId]);
  return terms;
}