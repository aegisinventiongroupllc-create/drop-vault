import { useState } from "react";
import { FileText, DollarSign, Clock, Loader2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomRequests, acceptRequest, declineRequest, counterRequest, type CustomRequestRow } from "@/hooks/useCustomRequests";
import { TOKEN_BASE_VALUE_USD } from "@/lib/tokenEconomy";
import { toast } from "@/hooks/use-toast";

function timeLeft(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}

function statusBadge(status: string) {
  switch (status) {
    case "pending": return "bg-gold/10 text-gold border-gold/30";
    case "accepted": return "bg-primary/10 text-primary border-primary/30";
    case "countered": return "bg-amber-400/10 text-amber-400 border-amber-400/30";
    case "paid": return "bg-blue-400/10 text-blue-400 border-blue-400/30";
    case "completed": return "bg-green-400/10 text-green-400 border-green-400/30";
    case "declined": return "bg-destructive/10 text-destructive border-destructive/30";
    default: return "bg-secondary text-muted-foreground border-border";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "pending": return "Awaiting Your Response";
    case "accepted": return "Accepted — Awaiting Payment";
    case "countered": return "Counter Sent";
    case "paid": return "Paid — Deliver Now";
    case "completed": return "Completed";
    case "declined": return "Declined";
    default: return status;
  }
}

const CreatorRequestsPanel = () => {
  const { requests, loading, refresh } = useCustomRequests("creator");
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState("");
  const [counterMsg, setCounterMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAccept = async (req: CustomRequestRow) => {
    setBusy(true);
    const { error } = await acceptRequest(req.id);
    setBusy(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Request accepted", description: `Waiting for @${req.creator_name ? "customer" : "customer"} to pay.` });
    refresh();
  };

  const handleDecline = async (req: CustomRequestRow) => {
    setBusy(true);
    const { error } = await declineRequest(req.id);
    setBusy(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Request declined" });
    refresh();
  };

  const handleCounter = async (req: CustomRequestRow) => {
    const usd = Number(counterPrice) * TOKEN_BASE_VALUE_USD;
    if (!counterPrice || usd <= 0) return;
    setBusy(true);
    const { error } = await counterRequest(req.id, usd, counterMsg);
    setBusy(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Counter-offer sent" });
    setRespondingTo(null);
    setCounterPrice("");
    setCounterMsg("");
    refresh();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">The Request Vault</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Custom media requests from fans. Accept, counter, or decline.</p>

        {/* Reuse tip */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4 flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground">
            <span className="text-foreground font-semibold">Pro tip:</span> You can reuse request videos in your library to earn more money from other fans.
          </p>
        </div>

        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No requests yet. They'll appear here when fans send them.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const expired = req.expires_at && new Date(req.expires_at) < new Date();
              const fulfillmentLeft = req.fulfillment_deadline ? timeLeft(req.fulfillment_deadline) : null;

              return (
                <div key={req.id} className="border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{req.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">From a fan</p>
                    </div>
                    <div className="flex items-center gap-1 bg-primary/10 border border-primary/30 rounded-full px-2.5 py-1">
                      <DollarSign className="w-3 h-3 text-primary" />
                      <span className="text-sm font-bold text-primary">{req.amount_usd}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusBadge(expired && req.status === "pending" ? "declined" : req.status)}`}>
                      {expired && req.status === "pending" ? "Expired" : statusLabel(req.status)}
                    </span>
                    {req.expires_at && !expired && req.status === "pending" && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeLeft(req.expires_at)}
                      </span>
                    )}
                  </div>

                  {/* Fulfillment deadline for paid requests */}
                  {req.status === "paid" && fulfillmentLeft && (
                    <div className="mt-2 bg-blue-400/10 border border-blue-400/30 rounded-lg p-2 text-center">
                      <p className="text-xs text-blue-400 font-bold">⏰ Deliver within {fulfillmentLeft}</p>
                    </div>
                  )}

                  {/* Counter-offer info */}
                  {req.status === "countered" && req.counter_offer_usd && (
                    <div className="mt-2 bg-amber-400/10 border border-amber-400/30 rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground">Your counter: <span className="text-amber-400 font-bold">${req.counter_offer_usd}</span></p>
                      {req.counter_message && <p className="text-[10px] text-muted-foreground italic mt-1">"{req.counter_message}"</p>}
                    </div>
                  )}

                  {/* Action buttons for pending requests */}
                  {req.status === "pending" && !expired && respondingTo !== req.id && (
                    <div className="flex gap-2 mt-3">
                      <Button variant="neon" size="sm" className="flex-1" onClick={() => handleAccept(req)} disabled={busy}>
                        ACCEPT ${req.amount_usd}
                      </Button>
                      <Button variant="gold" size="sm" className="flex-1" onClick={() => { setRespondingTo(req.id); setCounterPrice(""); setCounterMsg(""); }}>
                        COUNTER
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={() => handleDecline(req)} disabled={busy}>
                        ✕
                      </Button>
                    </div>
                  )}

                  {/* Counter-offer form */}
                  {respondingTo === req.id && (
                    <div className="mt-3 bg-secondary/50 border border-border rounded-xl p-3 space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground tracking-wider">YOUR PRICE (BIT-TOKENS, max 500)</label>
                        <input
                          type="number" min={1} max={500}
                          value={counterPrice}
                          onChange={(e) => setCounterPrice(e.target.value)}
                          placeholder="e.g. 30"
                          className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1"
                        />
                        {counterPrice && Number(counterPrice) > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1">= ${Number(counterPrice) * TOKEN_BASE_VALUE_USD} USD</p>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground tracking-wider">MESSAGE (OPTIONAL)</label>
                        <textarea
                          value={counterMsg}
                          onChange={(e) => setCounterMsg(e.target.value)}
                          placeholder="Explain your pricing..."
                          className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1 h-16 resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="gold" size="sm" className="flex-1" onClick={() => handleCounter(req)} disabled={busy || !counterPrice}>
                          SEND COUNTER — {counterPrice || "?"} BT
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setRespondingTo(null)}>CANCEL</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorRequestsPanel;
