import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CustomRequestRow {
  delivery_path: string | null;
  delivery_uploaded_at: string | null;
  delivery_access_until: string | null;
  creator_archived_at: string | null;
  origin_country: string | null;
  id: string;
  customer_id: string;
  creator_id: string | null;
  creator_name: string | null;
  description: string;
  amount_usd: number;
  tokens: number;
  creator_share_usd: number;
  platform_share_usd: number;
  status: string;
  payment_id: string | null;
  counter_offer_usd: number | null;
  counter_message: string | null;
  expires_at: string | null;
  fulfillment_deadline: string | null;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch custom requests for the current user (as customer or creator). */
export function useCustomRequests(role: "customer" | "creator") {
  const [requests, setRequests] = useState<CustomRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const col = role === "customer" ? "customer_id" : "creator_id";
    const rows: CustomRequestRow[] = [];
    for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from("custom_requests")
      .select("*")
      .eq(col, u.user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + 499);
    if (error || !data) break;
    rows.push(...(data as unknown as CustomRequestRow[]));
    if (data.length < 500) break;
    }
    setRequests(role === "creator" ? rows.filter((row) => !row.creator_archived_at) : rows);
    setLoading(false);
  }, [role]);

  useEffect(() => { refresh(); }, [refresh]);

  return { requests, loading, refresh };
}

/** Creator accepts a request at the offered price. */
export async function acceptRequest(id: string) {
  return supabase
    .from("custom_requests")
    .update({ status: "accepted" })
    .eq("id", id);
}

/** Creator declines a request. */
export async function declineRequest(id: string) {
  return supabase
    .from("custom_requests")
    .update({ status: "declined" })
    .eq("id", id);
}

/** Creator sends a counter-offer. */
export async function counterRequest(id: string, counterUsd: number, message: string) {
  return supabase
    .from("custom_requests")
    .update({
      status: "countered",
      counter_offer_usd: counterUsd,
      counter_message: message,
    })
    .eq("id", id);
}

/** Customer accepts a counter-offer — updates amount to the counter price and moves to accepted. */
export async function acceptCounterOffer(id: string, counterUsd: number) {
  return supabase
    .from("custom_requests")
    .update({ status: "accepted", amount_usd: counterUsd })
    .eq("id", id);
}

/** Customer declines a counter-offer. */
export async function declineCounter(id: string) {
  return supabase
    .from("custom_requests")
    .update({ status: "declined" })
    .eq("id", id);
}
