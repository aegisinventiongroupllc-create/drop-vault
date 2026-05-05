import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const SECRET = Deno.env.get("CRYPTOCLOUD_SECRET_KEY")!;
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

    console.log("CryptoCloud postback", payload);

    const token = payload.token;
    if (!token) {
      return new Response(JSON.stringify({ error: "missing token" }), { status: 400 });
    }
    const verified = await verifyJwtHS256(token, SECRET);
    if (!verified) {
      return new Response(JSON.stringify({ error: "invalid signature" }), { status: 401 });
    }

    const status = (payload.status || "").toLowerCase();
    const invoiceId = payload.invoice_id;
    const orderId = payload.order_id;
    const amountUsd = parseFloat(payload.amount_crypto ? payload.invoice_info_amount || "0" : payload.amount || "0");

    if (status !== "success") {
      return new Response(JSON.stringify({ ok: true, ignored: status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // order_id format: dtt-<ts>-<tokens>-<userId>
    if (!orderId?.startsWith("dtt-")) {
      return new Response(JSON.stringify({ ok: true, ignored: "non-dtt order" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parts = orderId.split("-");
    const tokens = parseInt(parts[2], 10);
    const userId = parts.slice(3).join("-");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: credited, error: rpcErr } = await supabase.rpc("credit_tokens", {
      _user_id: userId,
      _payment_id: invoiceId,
      _tokens: tokens,
      _amount_usd: amountUsd || 0,
    });

    if (rpcErr) {
      console.error("credit_tokens error", rpcErr);
      return new Response(JSON.stringify({ error: rpcErr.message }), { status: 500 });
    }

    return new Response(
      JSON.stringify({ ok: true, tokens_credited: credited, buyer_id: userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
});