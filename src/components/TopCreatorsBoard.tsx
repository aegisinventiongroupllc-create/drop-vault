import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Row = {
  user_id: string; display_name: string | null; gross: number; creator_share: number;
  platform_share: number; sales: number; owed: number; paid: number;
};

const usd = (n: number) => `$${n.toFixed(2)}`;

const Board = ({ title, rows }: { title: string; rows: Row[] }) => (
  <div className="space-y-2">
    <p className="text-xs font-bold uppercase tracking-wider text-primary">{title}</p>
    {rows.length === 0 ? (
      <p className="text-xs text-muted-foreground">No earnings yet.</p>
    ) : rows.map((r, i) => (
      <div key={r.user_id} className="rounded-lg border border-border bg-secondary/40 p-2">
        <div className="flex justify-between text-sm font-semibold text-foreground">
          <span>#{i + 1} {r.display_name || r.user_id.slice(0, 6)}</span>
          <span className="text-primary">{usd(r.creator_share)}</span>
        </div>
        <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground mt-1">
          <span>Sales: {r.sales}</span>
          <span>Gross: {usd(r.gross)}</span>
          <span>Your cut: {usd(r.platform_share)}</span>
          <span>Paid: {usd(r.paid)}</span>
          <span>Owed: {usd(r.owed)}</span>
        </div>
      </div>
    ))}
  </div>
);

const TopCreatorsBoard = ({ callFinance }: { callFinance: (a: string) => Promise<any> }) => {
  const [data, setData] = useState<{ women: Row[]; men: Row[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try { setData(await callFinance("top_creators")); } catch { setData({ women: [], men: [] }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Top 10 Earning Creators</p>
        <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={load} disabled={loading}>
          {loading ? "LOADING" : "REFRESH"}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Board title="Women Creators" rows={data?.women ?? []} />
        <Board title="Men Creators" rows={data?.men ?? []} />
      </div>
    </Card>
  );
};

export default TopCreatorsBoard;
