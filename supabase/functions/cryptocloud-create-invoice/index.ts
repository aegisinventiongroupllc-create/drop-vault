import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { priceAgreedRequest } from "../_shared/customRequestPayment.ts";
import { liveCheckoutEnabled } from "../_shared/paymentReadiness.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHOP_ID = (Deno.env.get("CRYPTOCLOUD_SHOP_ID") ?? "").trim();
const API_KEY = (Deno.env.get("CRYPTOCLOUD_API_KEY") ?? "").trim().replace(/^Token\s+/i, "");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ---- Server-side price catalog. The browser may only pick an item, never a price. ----
const ADMIN_FEE_USD = 1;
const CUSTOM_REQUEST_PROCESSING_FEE_USD = 4; // card-processing cover, paid by the customer
const TOKEN_BASE_VALUE_USD = 20;
const CONVENIENCE_FEE_TOKENS = 1;
const CUSTOM_TIER_PRICES = [500, 1000, 2500, 5000, 10001];
const MAX_CUSTOM_TOKENS = 500;

const TOKEN_PACKAGES: Record<string, { amount_usd: number; tokens: number }> = {
  single: { amount_usd: 25, tokens: 1 },
  bundle: { amount_usd: 125, tokens: 5 },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function priceRequest(body: any): { amount_usd: number; tokens: number } | { error: string } {
  const kind = typeof body?.kind === "string" ? body.kind : "token_package";

  if (kind === "token_package") {
    if (String(body?.package ?? "") === "custom") {
      const q = Number(body?.quantity);
      if (!Number.isInteger(q) || q < 1 || q > 100) return { error: "Choose between 1 and 100 Bit-Tokens" };
      return { amount_usd: q * 25, tokens: q };
    }
    const pkg = TOKEN_PACKAGES[String(body?.package ?? "")];
    if (!pkg) return { error: "Unknown token package" };
    return pkg;
  }

  // Vault Entry Pass: $20 flat, no tokens, credited by the webhook.
  if (kind === "entry_pass") {
    return { amount_usd: 20, tokens: 0 };
  }

  if (kind === "custom_request") {
    let base: number | null = null;

    if (body?.tier_price !== undefined) {
      const tierPrice = Number(body.tier_price);
      if (!CUSTOM_TIER_PRICES.includes(tierPrice)) return { error: "Unknown request tier" };
      base = tierPrice;
    } else if (body?.bid_tokens !== undefined) {
      const bid = Number(body.bid_tokens);
      if (!Number.isInteger(bid) || bid < 1 || bid > MAX_CUSTOM_TOKENS) {
        return { error: "Bid must be a whole number of tokens between 1 and 500" };
      }
      base = bid * TOKEN_BASE_VALUE_USD;
    }

    if (base === null) return { error: "Missing request price" };

    return {
      amount_usd: base + ADMIN_FEE_USD + CUSTOM_REQUEST_PROCESSING_FEE_USD,
      tokens: Math.round(base / TOKEN_BASE_VALUE_USD) + CONVENIENCE_FEE_TOKENS,
    };
  }

  return { error: "Unknown purchase type" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const enabled = liveCheckoutEnabled({
      credentialsPresent: Boolean(SHOP_ID && API_KEY),
      webhookSecret: Deno.env.get("CRYPTOCLOUD_SECRET_KEY") ?? "",
      approval: Deno.env.get("DTT_TRYBIT_LIVE_APPROVED"),
      checkoutVerified: Deno.env.get("DTT_TRYBIT_CHECKOUT_VERIFIED"),
    });
    if (body?.probe === true) return json({ enabled });
    if (!enabled || !SUPABASE_URL || !SERVICE_ROLE) {
      return json({ error: "TryBit checkout is unavailable pending approval and verified checkout.", enabled: false }, 503);
    }
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const server = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const isCustomRequest = body?.kind === "custom_request";
    let requestPrice: { base_usd: number; amount_usd: number } | null = null;
    let requestId = "";
    if (isCustomRequest) {
      // Requests are paid only after agreement, at the agreed price stored on the server.
      requestId = typeof body?.request_id === "string" ? body.request_id : "";
      if (!/^[0-9a-f-]{36}$/i.test(requestId)) return json({ error: "Choose an accepted request to pay" }, 400);
      const { data: request } = await server.from("custom_requests")
        .select("id,customer_id,status,amount_usd").eq("id", requestId).maybeSingle();
      requestPrice = priceAgreedRequest(request, userId);
      if (!requestPrice) return json({ error: "This request is not ready for payment" }, 409);
    }
    if (isCustomRequest && !requestPrice) return json({ error: "This request is not ready for payment" }, 409);
    const priced = requestPrice ? { amount_usd: requestPrice.amount_usd, tokens: 0 } : priceRequest(body);
    if ("error" in priced) return json({ error: priced.error }, 400);

    const { amount_usd, tokens } = priced;
    const isEntryPass = body?.kind === "entry_pass";
    const orderId = isEntryPass
      ? `dttpass-${Date.now()}-${userId}`
      : isCustomRequest ? `dttreq-${Date.now()}-${requestId}`
      : `dtt-${Date.now()}-${tokens}-${userId}`;

    const ccRes = await fetch("https://api.trybit.com/v2/invoice/create", {
      method: "POST",
      headers: {
        "Authorization": `Token ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shop_id: SHOP_ID,
        amount: amount_usd,
        currency: "USD",
        order_id: orderId,
        add_fields: {
          time_to_pay: { hours: 2, minutes: 0 },
          available_currencies: ["LTC", "USDT_TRC20"],
          cryptocurrency: "LTC",
        },
      }),
    });

    const ccJson = await ccRes.json();
    if (!ccRes.ok || ccJson?.status !== "success") {
      console.error("CryptoCloud error", ccJson);
      const detail = String(ccJson?.detail ?? "");
      const invalidToken = /токен|token/i.test(detail);
      return json(
        {
          error: invalidToken
            ? "Payments are temporarily unavailable: the payment provider rejected the store credentials."
            : ccJson?.result?.message || "CryptoCloud invoice creation failed",
        },
        502
      );
    }

    const invoice = ccJson.result;
    const isTokenPackage = !body?.kind || body.kind === "token_package";
    if (isEntryPass || isTokenPackage || isCustomRequest) {
      if (typeof invoice?.uuid !== "string" || !invoice.uuid) return json({ error: "Invalid payment invoice" }, 502);
      const receipt = {
        payment_id: invoice.uuid.replace(/^INV-/i, ""), order_id: orderId,
        user_id: userId, amount_usd, currency: "USD",
      };
      const { error } = isCustomRequest
        ? await server.from("custom_request_payment_receipts").insert({
            ...receipt, request_id: requestId, base_usd: requestPrice?.base_usd,
          })
        : isEntryPass
        ? await server.from("entry_pass_payment_receipts").insert({ ...receipt, method: "crypto" })
        : await server.from("token_payment_receipts").insert({ ...receipt, tokens });
      if (error) return json({ error: "Checkout could not be recorded; please retry" }, 500);
    }
    return json({
      invoice_url: invoice.link,
      invoice_id: invoice.uuid,
      order_id: orderId,
      amount_usd,
      tokens,
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Checkout could not be started" }, 500);
  }
});
