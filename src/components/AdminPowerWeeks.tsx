import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { POWER_WEEK_SPLIT } from "@/lib/paymentSplit";

interface PowerWeekRow {
  id: string;
  creator_id: string;
  display_name: string | null;
  side: "women" | "men";
  started_at: string;
  ends_at: string;
  milestone_followers: number;
  status: "active" | "ended" | "paid";
  unlocks: number;
  gross: number;
  creator_share: number;
  platform_share: number;
  paid_at: string | null;
  paid_amount_usd: number | null;
  paid_note: string | null;
}

const money = (n: number | null | undefined) =>
  `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (s: string) => new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const timeLeft = (endsAt: string) => {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${d}D ${h}H ${m}M left`;
};

type Call = (payload: Record<string, unknown>) => Promise<any>;

const AdminPowerWeeks = ({ callFinance }: { callFinance: Call }) => {
  const [side, setSide] = useState<"women" | "men">("women");
  const [rows, setRows] = useState<PowerWeekRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const callRef = useRef(callFinance);
  callRef.current = callFinance;

  const load = useCallback(async () => {
    setLoading(true);
    const data = await callRef.current({ action: "power_weeks" });
    if (data?.error) setMessage(data.error);
    setRows(Array.isArray(data?.weeks) ? data.weeks : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const markPaid = async (row: PowerWeekRow) => {
    if (!confirm(`Send ${money(row.creator_share)} to ${row.display_name ?? "this creator"} first. Mark this Power Week as PAID and move it to records?`)) return;
    setBusyId(row.id);
    const data = await callRef.current({ action: "power_week_mark_paid", id: row.id });
    setMessage(data?.error ?? `Filed ${money(data.amount)} to records.`);
    setBusyId(null);
    load();
  };

  const mine = rows.filter((r) => r.side === side);
  const active = mine.filter((r) => r.status === "active");
  const ended = mine.filter((r) => r.status === "ended");
  const paid = mine.filter((r) => r.status === "paid");
  const sideClass = side === "women" ? "text-primary" : "text-accent";

  const Card = ({ r }: { r: PowerWeekRow }) => (
    <div className="border border-border rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">{r.display_name ?? "Creator"}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border border-border ${sideClass}`}>
          {r.status === "active" ? `${POWER_WEEK_SPLIT.creator}/${POWER_WEEK_SPLIT.platform}` : r.status === "ended" ? "BACK TO 90/10" : "PAID"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><p className="text-[10px] text-muted-foreground">UNLOCKS</p><p className="text-sm font-bold text-foreground">{r.unlocks}</p></div>
        <div><p className="text-[10px] text-muted-foreground">CREATOR EARNED</p><p className="text-sm font-bold text-foreground">{money(r.creator_share)}</p></div>
        <div><p className="text-[10px] text-muted-foreground">YOUR CUT</p><p className="text-sm font-bold text-foreground">{money(r.platform_share)}</p></div>
      </div>
      <p className="text-[10px] text-muted-foreground">{date(r.started_at)} → {date(r.ends_at)}</p>
      {r.status === "active" && <p className={`text-xs font-bold font-mono ${sideClass}`}>{timeLeft(r.ends_at)}</p>}
      {r.status === "ended" && (
        <Button size="sm" variant="neon" className="w-full" disabled={busyId === r.id} onClick={() => markPaid(r)}>
          {busyId === r.id ? "FILING..." : `MARK PAID ${money(r.creator_share)} & FILE`}
        </Button>
      )}
      {r.status === "paid" && r.paid_at && (
        <p className="text-[10px] text-muted-foreground">Paid {money(r.paid_amount_usd)} on {date(r.paid_at)}</p>
      )}
    </div>
  );

  const Section = ({ title, list, empty }: { title: string; list: PowerWeekRow[]; empty: string }) => (
    <div className="bg-card border border-border rounded-xl p-4">
      <h4 className="text-sm font-bold text-foreground mb-3 tracking-wider">{title} ({list.length})</h4>
      <div className="space-y-3">
        {list.map((r) => <Card key={r.id} r={r} />)}
        {list.length === 0 && <p className="text-sm text-muted-foreground text-center py-3">{loading ? "Loading..." : empty}</p>}
      </div>
    </div>
  );

  return (
    <div className="px-4 space-y-4">
      <div className="bg-card border border-primary/30 rounded-xl p-5 text-center">
        <h3 className="text-lg font-bold text-foreground tracking-wider">POWER WEEK MONITOR</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Creators keep {POWER_WEEK_SPLIT.creator}% for 7 days, then the split goes back to 90/10 automatically.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["women", "men"] as const).map((s) => (
          <Button key={s} size="sm" variant={side === s ? "neon" : "outline"} onClick={() => setSide(s)}>
            {s === "women" ? "WOMEN" : "MEN"} ({rows.filter((r) => r.side === s && r.status === "active").length} LIVE)
          </Button>
        ))}
      </div>

      {message && <p className="text-xs text-center text-muted-foreground">{message}</p>}

      <Section title="ON POWER WEEK NOW" list={active} empty="No creators on a Power Week right now." />
      <Section title="FINISHED — READY TO PAY" list={ended} empty="Nothing waiting to be paid." />
      <Section title="RECORDS — PAID" list={paid} empty="No paid Power Weeks on file yet." />
    </div>
  );
};

export default AdminPowerWeeks;
