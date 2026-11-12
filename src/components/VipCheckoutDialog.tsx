import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { affirmAgeConsent } from "@/lib/ageConsent";
import { TermsOfService, PrivacyPolicy, RefundPolicy } from "@/components/LegalFooter";

export async function vipFunctionError(error: unknown): Promise<string> {
  const context = (error as { context?: Response })?.context;
  try { const body = await context?.clone().json(); if (body?.error) return String(body.error); } catch { /* fallback below */ }
  return error instanceof Error ? error.message : "VIP checkout is unavailable. Please retry.";
}

export default function VipCheckoutDialog({ pass, onClose, onCreated }: { pass: { id: string; name: string; price: number }; onClose: () => void; onCreated: () => void }) {
  const [age, setAge] = useState(false), [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [policy, setPolicy] = useState<"terms" | "privacy" | "refund" | null>(null);
  const start = async () => {
    if (!age || !consent || busy) return;
    setBusy(true); setError("");
    // Open during the user's click to avoid mobile popup blockers.
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    try {
      const saved = await supabase.from("legal_consents").insert({ terms_version: "2.0", consent_type: "checkout_consent", user_agent: navigator.userAgent, consent_text: `[VIP CHECKOUT] ${pass.name} $${pass.price}. I am 18+ and agree to Terms, Privacy and Refund Policy. One-time payment; activation only after verified payment. Shared 1,000-pass first-come limit. Purchase consent may be retained and shared with the processor to resolve disputes.` });
      if (saved.error) throw new Error("Your purchase consent could not be saved. Please retry.");
      const receipt = await affirmAgeConsent("checkout");
      const result = await supabase.functions.invoke("vip-checkout", { body: { action: "create", pass_type: pass.id, consent_receipt: receipt } });
      if (result.error) throw new Error(await vipFunctionError(result.error));
      if (!result.data?.invoice_url) throw new Error(result.data?.error ?? "Checkout could not be prepared.");
      if (popup) popup.location.href = result.data.invoice_url;
      onCreated();
    } catch (e) { popup?.close(); setError(e instanceof Error ? e.message : "Checkout failed."); }
    finally { setBusy(false); }
  };
  return createPortal(<div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/90 p-4 backdrop-blur-md">
    <section role="dialog" aria-modal="true" aria-labelledby="vip-checkout-title" className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-lg border border-gold/40 bg-card p-5 space-y-4">
      <h2 id="vip-checkout-title" className="font-display font-bold text-gold">{pass.name} CHECKOUT</h2>
      <p className="text-xl font-bold text-foreground">${pass.price.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">USD · one-time payment</span></p>
      <p className="text-sm text-muted-foreground">Limited to 1,000 worldwide across Pro and Elite combined. First come, first served. Your pass activates only after DTT verifies payment.</p>
      <label className="flex items-start gap-3 text-sm text-foreground"><Checkbox checked={age} onCheckedChange={v => setAge(v === true)} aria-label="I am at least 18 years old" /><span>I am at least 18 years old.</span></label>
      <label className="flex items-start gap-3 text-sm text-foreground"><Checkbox checked={consent} onCheckedChange={v => setConsent(v === true)} aria-label="I agree to the VIP purchase policies" /><span>I agree to the Terms, Privacy and Refund Policy. Purchase consent may be retained with the transaction and shared with the payment processor to resolve disputes.</span></label>
      <div className="flex flex-wrap gap-2">{(["terms", "privacy", "refund"] as const).map(p => <Button key={p} variant="link" size="sm" onClick={() => setPolicy(p)}>{p === "terms" ? "Terms" : p === "privacy" ? "Privacy" : "Refund Policy"}</Button>)}</div>
      {policy && <div className="space-y-3 border-y border-border py-3">{policy === "terms" ? <TermsOfService /> : policy === "privacy" ? <PrivacyPolicy /> : <RefundPolicy />}<Button variant="outline" size="sm" onClick={() => setPolicy(null)}>CLOSE POLICY</Button></div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button variant="gold" className="w-full" disabled={!age || !consent || busy} onClick={() => void start()}>{busy ? "PREPARING CHECKOUT…" : "PAY WITH TRYBIT"}</Button>
      <Button variant="ghost" className="w-full" disabled={busy} onClick={onClose}>CLOSE</Button>
    </section>
  </div>, document.body);
}