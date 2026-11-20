import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
export function useCustomerEntryOffer() {
  const [offer, setOffer] = useState<{ amount: number; open: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    void supabase.rpc("my_customer_entry_offer").then(({ data, error }) => {
      if (!active || error || !data || typeof data !== "object" || Array.isArray(data)) return;
      const amount = Number(data.amount_usd);
      if (amount === 10 || amount === 20) setOffer({ amount, open: data.checkout_open === true });
    });
    return () => { active = false; };
  }, []);
  return offer;
}