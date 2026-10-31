import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { earnedTokenCount } from "@/lib/creatorWelcomeBack";
import { REVENUE_FIELDS, revenueMonthBounds, recordedSplit, type RevenueRecord } from "@/lib/monthlyRevenue";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CreatorRevenueTerms from "@/components/CreatorRevenueTerms";

interface MonthlyRevenue {
  month: string;
  transaction_count: number;
  base_usd: number;
  creator_usd: number;
  platform_usd: number;
  entry_fee_usd: number;
  commission_usd: number;
}

export default function CreatorEarningsBreakdown({ creatorId }: { creatorId: string | null }) {
  const [rows, setRows] = useState<RevenueRecord[]>([]);
  const [months, setMonths] = useState<MonthlyRevenue[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthsLoading, setMonthsLoading] = useState(true);
  const [monthsFailed, setMonthsFailed] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [more, setMore] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setRows([]);
    setMonths([]);
    setPage(0);
    setMonthsLoading(true);
    setMonthsFailed(false);
    if (!creatorId) { setMonthsLoading(false); return; }
    void (async () => {
      const { data, error } = await supabase.rpc("get_my_monthly_revenue");
      if (cancelled) return;
      setMonthsFailed(!!error);
      setMonths(data ?? []);
      setMonth(data?.[0]?.month ?? new Date().toISOString().slice(0, 7));
      setMonthsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [creatorId, retry]);
  useEffect(() => {
    if (!creatorId || monthsLoading || monthsFailed) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    void (async () => {
      const bounds = revenueMonthBounds(month);
      const { data, error } = await supabase.from("transactions").select(REVENUE_FIELDS)
        .eq("creator_id", creatorId).eq("status", "completed")
        .gte("created_at", bounds.start).lt("created_at", bounds.end)
        .order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(page * 20, page * 20 + 20);
      if (cancelled) return;
      setFailed(!!error);
      setRows((data ?? []).slice(0, 20));
      setMore((data?.length ?? 0) > 20);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [creatorId, month, page, retry, monthsLoading, monthsFailed]);

  const usd = (value: number) => Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
  const summary = months.find((item) => item.month === month);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const availableMonths = Array.from(new Set([currentMonth, ...months.map((item) => item.month)])).sort().reverse();
  const monthLabel = (value: string) => new Date(`${value}-01T00:00:00Z`).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
  return <section className="border-t border-border py-5" aria-label="Detailed earnings">
    <h3 className="mb-4 text-base font-semibold text-foreground">Earnings breakdown</h3>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h4 className="text-sm font-semibold text-foreground">Monthly revenue history</h4>
      <Select value={month} onValueChange={(value) => { setMonth(value); setPage(0); }} disabled={monthsLoading || monthsFailed}>
        <SelectTrigger className="w-full sm:w-56" aria-label="Revenue month"><SelectValue /></SelectTrigger>
        <SelectContent>{availableMonths.map((value) => <SelectItem key={value} value={value}>{monthLabel(value)}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    {!monthsLoading && !monthsFailed && <dl className="mb-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3" aria-label="Monthly totals">
      <div><dt className="text-muted-foreground">Base value</dt><dd className="font-semibold">{usd(summary?.base_usd ?? 0)}</dd></div>
      <div><dt className="text-muted-foreground">You earned</dt><dd className="font-semibold text-gold">{usd(summary?.creator_usd ?? 0)}</dd></div>
      <div><dt className="text-muted-foreground">Platform share</dt><dd>{usd(summary?.platform_usd ?? 0)}</dd></div>
      <div><dt className="text-muted-foreground">Entry fees recorded</dt><dd>{usd(summary?.entry_fee_usd ?? 0)}</dd></div>
      <div><dt className="text-muted-foreground">Commission recorded</dt><dd>{usd(summary?.commission_usd ?? 0)}</dd></div>
      <div><dt className="text-muted-foreground">Completed transactions</dt><dd>{summary?.transaction_count ?? 0}</dd></div>
    </dl>}
    <div className="mb-4 rounded-lg border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
      <p className="mb-2 font-semibold text-foreground">How the money works</p>
      <CreatorRevenueTerms />
    </div>
    {loading || monthsLoading ? <p className="text-sm text-muted-foreground" role="status">Loading earnings…</p>
      : failed || monthsFailed ? <div><p className="text-sm text-destructive">Earnings couldn’t load.</p><Button variant="ghost" onClick={() => setRetry((value) => value + 1)}>Try again</Button></div>
      : rows.length === 0 ? <p className="text-sm text-muted-foreground">No completed earnings for {monthLabel(month)}.</p>
      : <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-xs">
        <thead className="text-muted-foreground"><tr><th className="pb-3">Received (UTC)</th><th>Bit-Tokens</th><th>Base value</th><th>Your split</th><th>Entry fee</th><th>Commission</th><th>Platform</th><th className="text-right">You earned</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border">
          <td className="py-3">{new Date(row.created_at).toLocaleString(undefined, { timeZone: "UTC" })}</td>
          <td>{earnedTokenCount(row) || "—"}</td><td>{usd(row.amount_usd)}</td>
          <td>{recordedSplit(row)}%</td><td>{usd(row.entry_tax)}</td><td>{usd(row.platform_commission)}</td>
          <td>{usd(row.platform_share_usd)}</td><td className="text-right font-semibold text-gold">{usd(row.creator_share_usd)}</td>
        </tr>)}</tbody>
      </table></div>}
    <div className="mt-4 flex justify-between">
      <Button variant="outline" size="sm" disabled={page === 0 || loading || monthsLoading || monthsFailed} onClick={() => setPage((value) => value - 1)}>Previous</Button>
      <Button variant="outline" size="sm" disabled={!more || loading || failed || monthsLoading || monthsFailed} onClick={() => setPage((value) => value + 1)}>Next</Button>
    </div>
  </section>;
}