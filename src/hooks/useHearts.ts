import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HeartRow { creator_id: string; created_at: string }

/** Creators the signed-in user has hearted (their saved library). */
export function useMyHearts() {
  const [hearts, setHearts] = useState<HeartRow[]>([]);

  const refresh = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) { setHearts([]); return; }
    const { data } = await supabase
      .from("creator_hearts")
      .select("creator_id, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setHearts((data ?? []) as HeartRow[]);
  }, []);

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel(`hearts-mine-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "creator_hearts" }, () => refresh())
      .subscribe();
    const onLocal = () => refresh();
    window.addEventListener("dtt-hearts-changed", onLocal);
    return () => { supabase.removeChannel(ch); window.removeEventListener("dtt-hearts-changed", onLocal); };
  }, [refresh]);

  return { hearts, refresh };
}

export async function fetchHeartCounts(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  const { data } = await supabase.rpc("get_heart_counts", { _creator_ids: ids });
  const map: Record<string, number> = {};
  (data ?? []).forEach((r: { creator_id: string; hearts: number }) => { map[r.creator_id] = Number(r.hearts); });
  return map;
}

/** Only aggregate totals are public; fan identities remain private. */
export function useHeartTotal(creatorId: string | null) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!creatorId) return;
    let cancelled = false;
    const load = async () => {
      const totals = await fetchHeartCounts([creatorId]);
      if (!cancelled) setCount(totals[creatorId] ?? 0);
    };
    void load();
    const channel = supabase.channel(`heart-total-${creatorId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "creator_heart_totals", filter: `creator_id=eq.${creatorId}` }, () => { void load(); }).subscribe();
    const onLocal = () => { void load(); };
    window.addEventListener("dtt-hearts-changed", onLocal);
    return () => { cancelled = true; void supabase.removeChannel(channel); window.removeEventListener("dtt-hearts-changed", onLocal); };
  }, [creatorId]);
  return count;
}

/** Returns new liked state, or null if the user isn't signed in / it failed. */
export async function toggleHeart(creatorId: string, currentlyLiked: boolean): Promise<boolean | null> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return null;
  if (currentlyLiked) {
    const { error } = await supabase.from("creator_hearts").delete().eq("user_id", uid).eq("creator_id", creatorId);
    if (error) return null;
  } else {
    const { error } = await supabase.from("creator_hearts").insert({ user_id: uid, creator_id: creatorId });
    if (error && !error.message.includes("duplicate")) return null;
  }
  window.dispatchEvent(new Event("dtt-hearts-changed"));
  return !currentlyLiked;
}
