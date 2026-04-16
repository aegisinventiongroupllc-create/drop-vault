import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CreatorStat {
  label: string;
  value: string;
  change: string;
}

export interface RevenueMonth {
  month: string;
  earned: number;
  withdrawn: number;
}

export interface TopFan {
  rank: number;
  name: string;
  spent: number;
}

export interface CreatorLiveStats {
  loading: boolean;
  creatorId: string | null;
  followerCount: number;
  totalViews: number;
  bitTokenRevenue: number;
  growthRate: number;
  totalEarnedUsd: number;
  totalPaidUsd: number;
  pendingBalanceUsd: number;
  revenueByMonth: RevenueMonth[];
  topFans: TopFan[];
}

const EMPTY_MONTHS: RevenueMonth[] = (() => {
  const now = new Date();
  const months: RevenueMonth[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: d.toLocaleString("en", { month: "short" }),
      earned: 0,
      withdrawn: 0,
    });
  }
  return months;
})();

const DEFAULT_STATS: CreatorLiveStats = {
  loading: true,
  creatorId: null,
  followerCount: 0,
  totalViews: 0,
  bitTokenRevenue: 0,
  growthRate: 0,
  totalEarnedUsd: 0,
  totalPaidUsd: 0,
  pendingBalanceUsd: 0,
  revenueByMonth: EMPTY_MONTHS,
  topFans: [],
};

const BIT_TOKEN_USD = 20;

export function useCreatorStats(): CreatorLiveStats {
  const [state, setState] = useState<CreatorLiveStats>(DEFAULT_STATS);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      // Followers proxy: count of customer profiles platform-wide.
      // Replace with a per-creator follows table once that feature ships.
      const { count: followerCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "customer");

      let totalEarnedUsd = 0;
      let totalPaidUsd = 0;
      let pendingBalanceUsd = 0;
      let revenueByMonth = EMPTY_MONTHS;
      let topFans: TopFan[] = [];
      let bitTokenRevenue = 0;
      let growthRate = 0;

      if (userId) {
        const [{ data: wallet }, { data: txs }] = await Promise.all([
          supabase
            .from("creator_wallets")
            .select("total_earned, total_paid, pending_balance")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("transactions")
            .select("amount_usd, creator_share_usd, buyer_id, created_at")
            .eq("creator_id", userId)
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(1000),
        ]);

        if (wallet) {
          totalEarnedUsd = Number(wallet.total_earned) || 0;
          totalPaidUsd = Number(wallet.total_paid) || 0;
          pendingBalanceUsd = Number(wallet.pending_balance) || 0;
        }

        if (txs && txs.length > 0) {
          // Monthly aggregation for last 6 months
          const monthsMap = new Map<string, RevenueMonth>();
          EMPTY_MONTHS.forEach((m) => monthsMap.set(m.month, { ...m }));
          const cutoff = new Date();
          cutoff.setMonth(cutoff.getMonth() - 5);
          cutoff.setDate(1);
          cutoff.setHours(0, 0, 0, 0);

          for (const t of txs) {
            const d = new Date(t.created_at);
            if (d < cutoff) continue;
            const key = d.toLocaleString("en", { month: "short" });
            const bucket = monthsMap.get(key);
            if (bucket) bucket.earned += Number(t.creator_share_usd) || 0;
          }
          revenueByMonth = Array.from(monthsMap.values());

          // Top fans by spend (buyer_id grouped)
          const spendByBuyer = new Map<string, number>();
          for (const t of txs) {
            if (!t.buyer_id) continue;
            spendByBuyer.set(
              t.buyer_id,
              (spendByBuyer.get(t.buyer_id) || 0) + (Number(t.amount_usd) || 0)
            );
          }
          const sorted = Array.from(spendByBuyer.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

          if (sorted.length > 0) {
            const buyerIds = sorted.map(([id]) => id);
            const { data: buyerProfiles } = await supabase
              .from("profiles")
              .select("user_id, display_name")
              .in("user_id", buyerIds);
            const nameMap = new Map(
              (buyerProfiles || []).map((p) => [p.user_id, p.display_name || "anon"])
            );
            topFans = sorted.map(([id, spent], idx) => ({
              rank: idx + 1,
              name: nameMap.get(id) || `${id.slice(0, 6)}`,
              spent: Math.round(spent),
            }));
          }

          // Growth rate: this month vs previous month earnings
          const now = new Date();
          const thisMonthKey = now.toLocaleString("en", { month: "short" });
          const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const prevKey = prev.toLocaleString("en", { month: "short" });
          const thisM = monthsMap.get(thisMonthKey)?.earned || 0;
          const prevM = monthsMap.get(prevKey)?.earned || 0;
          growthRate = prevM > 0 ? Math.round(((thisM - prevM) / prevM) * 100) : 0;
        }

        bitTokenRevenue = totalEarnedUsd / BIT_TOKEN_USD;
      }

      if (cancelled) return;
      setState({
        loading: false,
        creatorId: userId,
        followerCount: followerCount || 0,
        totalViews: 0, // placeholder until a media_views table exists
        bitTokenRevenue,
        growthRate,
        totalEarnedUsd,
        totalPaidUsd,
        pendingBalanceUsd,
        revenueByMonth,
        topFans,
      });
    }

    load();

    // Realtime: refetch when transactions or profiles change
    const channel = supabase
      .channel("creator-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "creator_wallets" }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return state;
}
