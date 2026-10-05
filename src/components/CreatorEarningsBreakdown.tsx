import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EARNING_FIELDS, earnedTokenCount, type CreatorEarning } from "@/lib/creatorWelcomeBack";

export default function CreatorEarningsBreakdown({ creatorId }: { creatorId: string | null }) {
  const [rows, setRows] = useState<CreatorEarning[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [more, setMore] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!creatorId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    void (async () => {
      const { data, error } = await supabase.from("transactions").select(EARNING_FIELDS)
        .eq("creator_id", creatorId).eq("status", "completed")
        .order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(page * 20, page * 20 + 20);
      if (cancelled) return;
      setFailed(!!error);
      setRows((data ?? []).slice(0, 20));
      setMore((data?.length ?? 0) > 20);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [creatorId, page, retry]);

  const usd = (value: number) => Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
  return <section className="border-t border-border py-5" aria-label="Detailed earnings">
    <h3 className="mb-4 text-base font-semibold text-foreground">Earnings breakdown</h3>
    {loading ? <p className="text-sm text-muted-foreground" role="status">Loading earnings…</p>
      : failed ? <div><p className="text-sm text-destructive">Earnings couldn’t load.</p><Button variant="ghost" onClick={() => setRetry((value) => value + 1)}>Try again</Button></div>
      : rows.length === 0 ? <p className="text-sm text-muted-foreground">No completed earnings yet.</p>
      : <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-xs">
        <thead className="text-muted-foreground"><tr><th className="pb-3">Received</th><th>Bit-Tokens</th><th>Value</th><th>Platform</th><th className="text-right">You earned</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border">
          <td className="py-3">{new Date(row.created_at).toLocaleString()}</td>
          <td>{earnedTokenCount(row) || "—"}</td><td>{usd(row.amount_usd)}</td>
          <td>{usd(row.platform_share_usd)}</td><td className="text-right font-semibold text-gold">{usd(row.creator_share_usd)}</td>
        </tr>)}</tbody>
      </table></div>}
    <div className="mt-4 flex justify-between">
      <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button>
      <Button variant="outline" size="sm" disabled={!more || loading || failed} onClick={() => setPage((value) => value + 1)}>Next</Button>
    </div>
  </section>;
}