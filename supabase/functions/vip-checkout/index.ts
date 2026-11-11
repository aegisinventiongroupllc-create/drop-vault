import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { liveCheckoutEnabled } from "../_shared/paymentReadiness.ts";
import { checkoutConsentValid } from "../_shared/checkoutConsent.ts";
import { invoiceKey } from "../_shared/entryPassPayment.ts";
import { vipPrice, verifyVipInvoice, vipInvoiceCanRelease, type VipReceipt } from "../_shared/vipPayment.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const apiKey = (Deno.env.get("CRYPTOCLOUD_API_KEY") ?? "").trim().replace(/^Token\s+/i, "");
const shop = (Deno.env.get("CRYPTOCLOUD_SHOP_ID") ?? "").trim();
const server = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
const enabled = () => liveCheckoutEnabled({ credentialsPresent: !!(apiKey && shop), webhookSecret: Deno.env.get("CRYPTOCLOUD_SECRET_KEY") ?? "", approval: Deno.env.get("DTT_TRYBIT_LIVE_APPROVED"), checkoutVerified: Deno.env.get("DTT_TRYBIT_CHECKOUT_VERIFIED") });

async function reconcile(checkout: { id: string; payment_id: string | null }) {
  if (!checkout.payment_id || !apiKey) return;
  const { data: receipt, error } = await server.from("vip_pass_payment_receipts").select("*").eq("payment_id", checkout.payment_id).maybeSingle();
  if (error || !receipt) throw new Error("VIP payment record unavailable");
  const response = await fetch("https://api.trybit.com/v2/invoice/merchant/info", { method: "POST", headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ uuids: [receipt.payment_id] }) });
  if (!response.ok) throw new Error("Payment verification is temporarily unavailable; your pass remains reserved.");
  const body = await response.json();
  if (body.status !== "success" || !Array.isArray(body.result)) throw new Error("Payment verification is temporarily unavailable; your pass remains reserved.");
  const invoice = body.result.find((i: { uuid?: string }) => invoiceKey(i.uuid) === receipt.payment_id);
  if (verifyVipInvoice(receipt as VipReceipt, invoice)) {
    const marked = await server.from("vip_pass_payment_receipts").update({ verified_at: new Date().toISOString() }).eq("payment_id", receipt.payment_id);
    if (marked.error) throw marked.error;
    const granted = await server.rpc("apply_verified_vip_pass", { _payment_id: receipt.payment_id });
    if (granted.error) throw granted.error;
  } else if (vipInvoiceCanRelease(receipt as VipReceipt, invoice)) {
    const released = await server.rpc("release_vip_checkout", { _checkout: checkout.id });
    if (released.error) throw released.error;
  }
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { data: auth, error: authError } = await server.auth.getUser((req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, ""));
    if (authError || !auth.user) return json({ error: "Please sign in before purchasing a VIP pass." }, 401);
    const userId = auth.user.id;
    const { data: role } = await server.rpc("has_role", { _user_id: userId, _role: "creator" });
    if (role !== true) return json({ error: "A creator account is required." }, 403);
    const [{ data: banned }, { data: withdrawn }] = await Promise.all([
      server.from("account_bans").select("user_id").eq("user_id", userId).maybeSingle(),
      server.from("creator_consent_withdrawals").select("id").eq("creator_id", userId).limit(1),
    ]);
    if (banned || withdrawn?.length) return json({ error: "This account cannot purchase a VIP pass." }, 403);
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "status";
    if (!["status", "create"].includes(action)) return json({ error: "Unknown checkout action" }, 400);
    const { data: pending, error: pendingError } = await server.from("vip_pass_checkouts").select("id,payment_id").eq("creator_id", userId).eq("status", "invoiced").maybeSingle();
    if (pendingError) throw pendingError;
    if (pending) await reconcile(pending);
    if (action === "status") {
      const client = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
      const { data, error } = await client.rpc("get_my_vip_store");
      if (error) throw error;
      return json({ ...data, enabled: enabled() });
    }
    if (!enabled()) return json({ error: "TryBit checkout is unavailable.", code: "unavailable" }, 503);
    if (vipPrice(body.pass_type) === null) return json({ error: "Choose Pro or Elite." }, 400);
    if (!(await checkoutConsentValid(server, body.consent_receipt, userId))) return json({ error: "Fresh age and checkout affirmation required" }, 403);
    // Reconcile a bounded batch of expired invoices, never releasing payable
    // holds solely because their local expiry elapsed.
    const { data: expired } = await server.from("vip_pass_checkouts").select("id,payment_id").eq("status", "invoiced").lt("expires_at", new Date().toISOString()).order("expires_at").limit(20);
    for (const checkout of expired ?? []) { try { await reconcile(checkout); } catch { /* keep stock held */ } }
    const { data: checkout, error: reserveError } = await server.rpc("reserve_vip_checkout", { _creator: userId, _pass: body.pass_type });
    if (reserveError) return json({ error: reserveError.message, code: /sold out/i.test(reserveError.message) ? "sold_out" : "conflict" }, 409);
    if (checkout.invoice_url) return json({ invoice_url: checkout.invoice_url, checkout_id: checkout.id });
    const { data: claimed, error: claimError } = await server.rpc("claim_vip_invoice", { _checkout: checkout.id });
    if (claimError) throw claimError;
    if (!claimed) return json({ error: "Your checkout is already being prepared. Check status before trying again.", code: "preparing" }, 409);
    // A network timeout after creation is ambiguous: preserve this reservation
    // rather than creating a second payable invoice on a retry.
    const response = await fetch("https://api.trybit.com/v2/invoice/create", { method: "POST", headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ shop_id: shop, amount: Number(checkout.amount_usd), currency: "USD", order_id: `dttvip-${checkout.id}`, add_fields: { time_to_pay: { hours: 2, minutes: 0 }, available_currencies: ["LTC", "USDT_TRC20"], cryptocurrency: "LTC" } }) });
    const result = await response.json();
    if (!response.ok || result.status !== "success") {
      // Only an explicit provider rejection is safe to release.
      if (response.status >= 400 && response.status < 500) await server.rpc("release_vip_checkout", { _checkout: checkout.id });
      return json({ error: "TryBit could not prepare this checkout. Please check status before retrying." }, 502);
    }
    const invoice = result.result;
    const url = new URL(invoice.link);
    if (!invoiceKey(invoice.uuid) || url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid payment checkout returned by TryBit");
    const attached = await server.rpc("attach_vip_invoice", { _checkout: checkout.id, _payment: invoiceKey(invoice.uuid), _url: url.href });
    if (attached.error) throw new Error("Your checkout needs reconciliation. Do not pay or create another invoice; contact DTT support.");
    return json({ invoice_url: url.href, checkout_id: checkout.id });
  } catch (error) {
    console.error("VIP checkout failed", error instanceof Error ? error.message : "unknown");
    return json({ error: error instanceof Error ? error.message : "VIP checkout is temporarily unavailable." }, 503);
  }
});