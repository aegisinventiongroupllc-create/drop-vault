import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getAdminPasscode } from "@/lib/adminSession";
export const FINANCE_LABELS = { gross: "Gross paid in", payments: "Completed payments", creator: "Creator earnings", platform: "Your platform share", purchase: "Purchase fees", tokens: "Per-token cuts", passes: "Entry passes", custom: "Custom request fees", total: "Your total (before processor fees)" };
export type FinanceCategory = keyof typeof FINANCE_LABELS;
interface RecordRow { id: string; created_at: string; status: string; payment_id: string | null; amount: number; gross: number; creator: number; platform: number; customer_name: string | null; creator_name: string | null; }
const usd = (value: number) => `$${Number(value).toFixed(2)}`;
export default function AdminFinanceBreakdown({ category, onClose, earnings }: { category: FinanceCategory | null; onClose: () => void; earnings: Record<string, number> }) {
  const [selected, setSelected] = useState<FinanceCategory | null>(category);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => { setSelected(category); setPage(0); }, [category]);
  useEffect(() => {
    let cancelled = false;
    setRows([]); setCount(0); setError("");
    if (!selected || selected === "total") { setBusy(false); return; }
    setBusy(true);
    void (async () => {
      try {
        const { data, error: failure } = await supabase.functions.invoke("admin-finance", { body: { action: "finance_details", category: selected, page }, headers: { "x-admin-passcode": getAdminPasscode() } });
        if (failure || data?.error) throw new Error("Couldn't load earnings records.");
        if (!cancelled) { setRows(data.rows); setCount(data.count); }
      } catch { if (!cancelled) setError("Couldn't load earnings records."); }
      finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [selected, page, retry]);
  const sources = [{ category: "purchase" as const, key: "purchase_fees" }, { category: "tokens" as const, key: "token_cuts" }, { category: "passes" as const, key: "entry_passes" }, { category: "custom" as const, key: "custom_request_fees" }];
  return <Dialog open={category !== null} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90dvh] overflow-y-auto p-4">
    <DialogTitle className="pr-6">{selected ? FINANCE_LABELS[selected] : "Earnings"}</DialogTitle><DialogDescription>Recorded amounts in USD · before processor fees.</DialogDescription>
    {selected === "creator" && <p className="text-xs text-muted-foreground">Original creator splits per payment. Earnings can include amounts already paid out.</p>}
    {selected === "custom" && <p className="text-xs text-gold">This existing total includes accepted requests. Accepted means agreed, not confirmed payment; those amounts are not collected earnings.</p>}
    {selected === "passes" && <p className="text-xs text-muted-foreground">This total includes active entry passes only.</p>}
    {category === "total" && selected !== "total" && <Button variant="outline" onClick={() => { setSelected("total"); setPage(0); }}>BACK TO TOTAL</Button>}
    {selected === "total" ? <div className="space-y-2">{sources.map((source) => <Button key={source.key} variant="outline" className="w-full h-auto min-h-12 justify-between gap-3 whitespace-normal text-left" onClick={() => { setSelected(source.category); setPage(0); }}><span>{FINANCE_LABELS[source.category]}</span><span className="shrink-0">{usd(earnings[source.key] ?? 0)}</span></Button>)}<p className="text-xs text-gold">Custom request totals may include accepted, unpaid requests. Processor fees are not deducted here.</p><div className="flex justify-between border-t border-border pt-3 font-bold"><span>Total recorded</span><span>{usd(earnings.total ?? 0)}</span></div></div> : busy ? <p role="status" className="py-6 text-muted-foreground">Loading records…</p> : error ? <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => setRetry((value) => value + 1)}>TRY AGAIN</Button></div> : <>
      <p className="text-xs text-muted-foreground">{count} records</p>
      {rows.length === 0 ? <p className="py-6 text-center text-muted-foreground">No matching records yet.</p> : <div className="divide-y divide-border">{rows.map((row) => <article key={row.id} className="py-3 space-y-2 min-w-0"><div className="flex justify-between gap-3"><time className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</time><strong className="shrink-0">{usd(row.amount)}</strong></div><p className="text-sm break-words">{row.customer_name || "Customer"}{row.creator_name ? ` → @${row.creator_name}` : ""}</p><p className={row.status === "accepted" ? "text-xs text-gold" : "text-xs text-muted-foreground"}>{row.status === "accepted" ? "Accepted — payment not confirmed" : row.status}</p><dl className="grid grid-cols-3 gap-2 text-xs"><div><dt className="text-muted-foreground">Gross</dt><dd>{usd(row.gross)}</dd></div><div><dt className="text-muted-foreground">Creator</dt><dd>{usd(row.creator)}</dd></div><div><dt className="text-muted-foreground">Platform</dt><dd>{usd(row.platform)}</dd></div></dl><p className="text-[10px] text-muted-foreground break-all">Record: {row.id}<br />Payment: {row.payment_id || "Not recorded"}</p></article>)}</div>}
      <div className="flex justify-between items-center gap-2"><Button variant="outline" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>PREVIOUS</Button><span className="text-xs">{page + 1} / {Math.max(1, Math.ceil(count / 50))}</span><Button variant="outline" disabled={(page + 1) * 50 >= count} onClick={() => setPage((value) => value + 1)}>NEXT</Button></div>
    </>}
  </DialogContent></Dialog>;
}
