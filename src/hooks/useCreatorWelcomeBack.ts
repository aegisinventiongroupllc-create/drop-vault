import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AWAY_MINIMUM_MS, EARNING_FIELDS, summarizeCreatorEarnings, type CreatorEarning } from "@/lib/creatorWelcomeBack";

export function useCreatorWelcomeBack(userId: string | null, enabled: boolean) {
  const [summary, setSummary] = useState<{ usd: number; tokens: number } | null>(null);

  useEffect(() => {
    if (!userId || !enabled) return;
    let disposed = false;
    let busy = false;
    let awayAt: number | null = null;
    const key = `dtt_creator_last_active:${userId}`;
    const read = () => {
      try {
        const value = Number(localStorage.getItem(key));
        return value > 0 && value <= Date.now() ? value : null;
      } catch { return null; }
    };
    const save = () => {
      try { localStorage.setItem(key, String(Date.now())); } catch { /* Private browsing is supported. */ }
    };
    const welcome = async (since: number | null) => {
      if (busy) return;
      busy = true;
      const until = Date.now();
      try {
        const { data: preference, error: roleError } = await supabase.from("account_preferences")
          .select("account_type").eq("user_id", userId).maybeSingle();
        if (roleError || preference?.account_type !== "creator" || disposed) return;
        const rows: CreatorEarning[] = [];
        if (since) {
          for (let offset = 0; ; offset += 500) {
            const { data, error } = await supabase.from("transactions").select(EARNING_FIELDS)
              .eq("creator_id", userId).eq("status", "completed")
              .gt("created_at", new Date(since).toISOString())
              .lte("created_at", new Date(until).toISOString())
              .order("created_at", { ascending: true }).order("id", { ascending: true })
              .range(offset, offset + 499);
            if (error || disposed) return; // Never invent a zero balance on failure.
            rows.push(...(data ?? []));
            if ((data?.length ?? 0) < 500) break;
          }
        }
        if (!disposed) {
          setSummary(summarizeCreatorEarnings(rows));
          save();
        }
      } catch { /* The dashboard remains usable if the summary cannot load. */ }
      finally { busy = false; }
    };
    const leave = () => {
      if (awayAt !== null) return;
      awayAt = Date.now();
      save();
    };
    const returnToTab = () => {
      if (document.hidden) return;
      const since = awayAt;
      awayAt = null;
      if (since !== null && Date.now() - since >= AWAY_MINIMUM_MS) void welcome(since);
    };
    const visibility = () => document.hidden ? leave() : returnToTab();
    if (!document.hidden) void welcome(read());
    const heartbeat = window.setInterval(() => {
      if (!document.hidden && awayAt === null && !busy) save();
    }, 15_000);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", leave);
    window.addEventListener("focus", returnToTab);
    window.addEventListener("pagehide", leave);
    return () => {
      disposed = true;
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", leave);
      window.removeEventListener("focus", returnToTab);
      window.removeEventListener("pagehide", leave);
      if (awayAt === null) save();
    };
  }, [userId, enabled]);

  return { summary, dismiss: () => setSummary(null) };
}