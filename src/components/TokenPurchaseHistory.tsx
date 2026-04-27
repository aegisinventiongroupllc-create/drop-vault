import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { History, Loader2 } from "lucide-react";

interface Purchase {
  id: string;
  payment_id: string;
  tokens_credited: number;
  amount_usd: number;
  status: string;
  created_at: string;
}

const TokenPurchaseHistory = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("token_purchases")
        .select("id, payment_id, tokens_credited, amount_usd, status, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled) {
        setPurchases((data as Purchase[]) || []);
        setLoading(false);
      }

      // Realtime: prepend new credits as they arrive
      const channel = supabase
        .channel(`purchase-history-${uid}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "token_purchases", filter: `user_id=eq.${uid}` },
          (payload: any) => {
            setPurchases((prev) => [payload.new as Purchase, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-4 mb-4 bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-bold text-foreground tracking-widest font-display">TOP-UP HISTORY</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      ) : purchases.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-4">
          No top-ups yet. Buy your first Bit-Tokens to get started.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {purchases.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  +{p.tokens_credited} Bit-Token{p.tokens_credited !== 1 ? "s" : ""}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(p.created_at).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-primary">${Number(p.amount_usd).toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{p.status}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TokenPurchaseHistory;