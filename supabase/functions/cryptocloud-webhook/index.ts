import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { confirmEntryPassInvoice, invoiceKey } from "../_shared/entryPassPayment.ts";
import { confirmTokenInvoice } from "../_shared/tokenPayment.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const SECRET = Deno.env.get("CRYPTOCLOUD_SECRET_KEY") ?? "";
const API_KEY = (Deno.env.get("CRYPTOCLOUD_API_KEY") ?? "").trim().replace(/^Token\s+/i, "");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function verifyJwtHS256(token: string, secret: string): Promise<any | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const data = new TextEncoder().encode(`${h}.${p}`);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const sig = b64urlDecode(s);
  const ok = await crypto.subtle.verify("HMAC", key, sig, data);
  if (!ok) return null;
  try {
    return JSON.parse(new TextDecoder().decode(b64urlDecode(p)));
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    // CryptoCloud sends application/x-www-form-urlencoded
    const ct = req.headers.get("content-type") || "";
    let payload: Record<string, string> = {};
    if (ct.includes("application/json")) {
      payload = await req.json();
    } else {
      const form = await req.formData();
      for (const [k, v] of form.entries()) payload[k] = String(v);
    }

    const token = payload.token;
    if (!token || !SECRET) {
      return new Response(JSON.stringify({ error: "missing token" }), { status: 400 });
    }
    const verified = await verifyJwtHS256(token, SECRET);
    if (!verified) {
      return new Response(JSON.stringify({ error: "invalid signature" }), { status: 401 });
    }

    const status = (payload.status || "").toLowerCase();
    const invoiceId = payload.invoice_id;
    const orderId = payload.order_id;

    if (status !== "success") {
      return new Response(JSON.stringify({ ok: true, ignored: status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vault Entry Pass orders use the dttpass-<ts>-<userId> prefix.
    if (orderId?.startsWith("dttpass-")) {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: receipt, error: receiptError } = await supabase.from("entry_pass_payment_receipts")
        .select("*").eq("payment_id", invoiceKey(invoiceId)).eq("order_id", orderId).maybeSingle();
      if (receiptError || !receipt || !API_KEY) {
        return new Response(JSON.stringify({ error: "Unknown entry-pass checkout" }), { status: 400 });
      }
      await confirmEntryPassInvoice(receipt, async () => {
        const response = await fetch("https://api.trybit.com/v2/invoice/merchant/info", {
          method: "POST", headers: { Authorization: `Token ${API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ uuids: [receipt.payment_id] }),
        });
        if (!response.ok) throw new Error("Payment verification unavailable");
        const body = await response.json();
        if (body.status !== "success" || !Array.isArray(body.result)) throw new Error("Invalid verification response");
        return body.result.find((item: { uuid?: string }) => invoiceKey(item.uuid) === receipt.payment_id);
      }, async () => {
        const { error } = await supabase.from("entry_pass_payment_receipts")
          .update({ verified_at: new Date().toISOString() }).eq("payment_id", receipt.payment_id);
        if (error) throw new Error("Could not record verified payment");
      }, async () => {
        const { error } = await supabase.rpc("credit_entry_pass", {
          _user_id: receipt.user_id, _payment_id: receipt.payment_id, _amount_usd: 20, _method: "crypto",
        });
        if (error) throw new Error("Could not grant verified entry pass");
      });
      return new Response(JSON.stringify({ ok: true, entry_pass: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Notifications identify a server-created checkout, not its buyer or price.
    if (!orderId?.startsWith("dtt-")) {
      return new Response(JSON.stringify({ ok: true, ignored: "non-dtt order" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: receipt, error: receiptError } = await supabase.from("token_payment_receipts")
      .select("*").eq("payment_id", invoiceKey(invoiceId)).eq("order_id", orderId).maybeSingle();
    if (receiptError || !receipt || !API_KEY) {
      return new Response(JSON.stringify({ error: "Unknown token checkout" }), { status: 400 });
    }
    const credited = await confirmTokenInvoice(receipt, async () => {
      const response = await fetch("https://api.trybit.com/v2/invoice/merchant/info", {
        method: "POST", headers: { Authorization: `Token ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uuids: [receipt.payment_id] }),
      });
      if (!response.ok) throw new Error("Payment verification unavailable");
      const body = await response.json();
      if (body.status !== "success" || !Array.isArray(body.result)) throw new Error("Invalid verification response");
      return body.result.find((item: { uuid?: string }) => invoiceKey(item.uuid) === receipt.payment_id);
    }, async () => {
      const { error } = await supabase.from("token_payment_receipts")
        .update({ verified_at: new Date().toISOString() }).eq("payment_id", receipt.payment_id);
      if (error) throw new Error("Could not record verified token payment");
    }, async () => {
      const { data, error } = await supabase.rpc("credit_tokens", {
        _user_id: receipt.user_id, _payment_id: receipt.payment_id,
        _tokens: receipt.tokens, _amount_usd: Number(receipt.amount_usd),
      });
      if (error) throw new Error("Could not grant verified tokens");
      return data === true;
    });
    return new Response(
      JSON.stringify({ ok: true, tokens_credited: credited }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Payment confirmation failed; no access granted" }), { status: 500 });
  }
});