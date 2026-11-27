import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseMenuItems, validMenuPrice, type RequestMenu } from "@/lib/requestMenus";
import RequestPriceSummary from "./RequestPriceSummary";
import BuyTokensModal from "./BuyTokensModal";

export default function CreatorRequestMenu({ creatorId }: { creatorId: string }) {
  const [menu, setMenu] = useState<RequestMenu | null>(null);
  const [selected, setSelected] = useState<number | "open" | null>(null);
  const [offer, setOffer] = useState("25");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [sent, setSent] = useState(false);
  const [nonce, setNonce] = useState(() => crypto.randomUUID());
  const [payment, setPayment] = useState<{ id: string; amountUsd: number; turnaroundDays: number; creatorPercent: 85 } | null>(null);
  useEffect(() => {
    let cancelled = false; setMenu(null);
    void supabase.from("creator_request_menus").select("*").eq("creator_id", creatorId).maybeSingle().then(({ data, error: failure }) => {
      if (cancelled) return;
      if (failure) setError("Couldn’t load custom requests.");
      if (data?.enabled) setMenu({ ...data, items: parseMenuItems(data.items) });
    });
    return () => { cancelled = true; };
  }, [creatorId]);
  if (!menu) return error ? <p className="mx-4 text-sm text-muted-foreground">{error}</p> : null;
  const item = typeof selected === "number" ? menu.items[selected] : null;
  const amount = item?.price_usd ?? Number(offer);
  const days = item?.turnaround_days ?? menu.open_turnaround_days;
  const pick = (value: number | "open") => { setSelected(value); setReview(false); setSent(false); setError(""); setDescription(""); setNonce(crypto.randomUUID()); };
  const submit = async () => {
    if (busy || !validMenuPrice(amount) || !description.trim()) return;
    setBusy(true); setError("");
    try {
      const { data: id, error: failure } = await supabase.rpc("create_menu_request", { _creator: creatorId, _item_index: typeof selected === "number" ? selected : null, _offer: amount, _description: description, _nonce: nonce });
      if (failure) throw failure;
      const result = await supabase.from("custom_requests").select("id,amount_usd,turnaround_days,status").eq("id", id).single();
      if (result.error) throw result.error;
      if (result.data.status === "accepted") { setPayment({ id: result.data.id, amountUsd: Number(result.data.amount_usd), turnaroundDays: result.data.turnaround_days, creatorPercent: 85 }); setSelected(null); }
      else setSent(true);
    } catch (e) { setError(e instanceof Error ? e.message : String((e as { message?: string }).message || "Couldn’t submit. Please retry.")); }
    finally { setBusy(false); }
  };
  return <>
    <section className="mx-4 my-6 space-y-4 border-t border-border pt-6">
      <h2 className="font-display text-xl font-bold text-primary">CUSTOM REQUEST MENU</h2>
      <p className="text-sm text-muted-foreground">Personal requests, priced separately. Your main vault still unlocks for 1 Bit-Token ($25 purchase price) for 14 days.</p>
      <div className="grid gap-3 sm:grid-cols-2">{menu.items.map((row, index) => <article key={index} className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="font-semibold break-words">{row.title}</h3><p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{row.description}</p><p className="text-sm">{row.turnaround_days} days after verified payment</p><p className="text-lg font-bold text-primary">${row.price_usd.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">+ $5 checkout fee</span></p><Button variant="neon" className="w-full" onClick={() => pick(index)}>REQUEST &amp; PAY</Button>
      </article>)}</div>
      {menu.open_requests && <Button variant="outline" className="w-full h-auto whitespace-normal py-3" onClick={() => pick("open")}>CUSTOM AMOUNT / OPEN REQUEST</Button>}
    </section>
    {selected !== null && createPortal(<div className="fixed inset-0 z-[210] flex items-center justify-center bg-background/90 p-3" role="dialog" aria-modal="true" aria-label="Menu request">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-lg font-bold text-primary">{sent ? "REQUEST SENT" : item?.title ?? "OPEN REQUEST"}</h2>
        {sent ? <p className="text-sm">Your offer is in MY REQUESTS. The creator can accept, counter or decline. No payment was taken.</p> : <>
          {item && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description}</p>}
          {selected === "open" && <label className="block text-sm">Your offer ($)<Input type="number" min={25} step="0.01" value={offer} disabled={review} onChange={e => setOffer(e.target.value)} /></label>}
          <label className="block text-sm">Your request details<Textarea value={description} maxLength={2000} disabled={review} onChange={e => setDescription(e.target.value)} /></label>
          {review && <RequestPriceSummary amount={amount} days={days} />}
          {review ? <Button variant="neon" className="w-full" disabled={busy} onClick={() => void submit()}>{busy ? "SAVING…" : selected === "open" ? "SEND OFFER — NO PAYMENT YET" : "CONTINUE TO CHECKOUT"}</Button> : <Button variant="neon" className="w-full" disabled={!validMenuPrice(amount) || !description.trim()} onClick={() => setReview(true)}>REVIEW REQUEST</Button>}
          {review && <Button variant="outline" className="w-full" disabled={busy} onClick={() => setReview(false)}>EDIT REQUEST</Button>}
        </>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button variant="ghost" className="w-full" disabled={busy} onClick={() => setSelected(null)}>{sent ? "DONE" : "BACK"}</Button>
      </div>
    </div>, document.body)}
    {payment && createPortal(<BuyTokensModal mode="custom_request" request={payment} onClose={() => setPayment(null)} onPurchase={() => {}} />, document.body)}
  </>;
}