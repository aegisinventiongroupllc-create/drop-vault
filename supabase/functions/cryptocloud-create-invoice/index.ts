import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHOP_ID = Deno.env.get("CRYPTOCLOUD_SHOP_ID")!;
const API_KEY = Deno.env.get("CRYPTOCLOUD_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ---- Server-side price catalog. The browser may only pick an item, never a price. ----
const ADMIN_FEE_USD = 1;
const TOKEN_BASE_VALUE_USD = 20;
const CONVENIENCE_FEE_TOKENS = 1;
const CUSTOM_TIER_PRICES = [500, 1000, 2500, 5000, 10001];
const MAX_CUSTOM_TOKENS = 500;

const TOKEN_PACKAGES: Record<string, { amount_usd: number; tokens: number }> = {
  single: { amount_usd: 21, tokens: 1 },
  bundle: { amount_usd: 101, tokens: 5 },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function priceRequest(body: any): { amount_usd: number; tokens: number } | { error: string } {
  const kind = typeof body?.kind === "string" ? body.kind : "token_package";

  if (kind === "token_package") {
    const pkg = TOKEN_PACKAGES[String(body?.package ?? "")];
    if (!pkg) return { error: "Unknown token package" };
    return pkg;
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
      amount_usd: base + ADMIN_FEE_USD,
      tokens: Math.round(base / TOKEN_BASE_VALUE_USD) + CONVENIENCE_FEE_TOKENS,
    };
  }

  return { error: "Unknown purchase type" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const priced = priceRequest(body);
    if ("error" in priced) return json({ error: priced.error }, 400);

    const { amount_usd, tokens } = priced;
    const orderId = `dtt-${Date.now()}-${tokens}-${userId}`;

    const ccRes = await fetch("https://api.cryptocloud.plus/v2/invoice/create", {
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
          available_currencies: ["LTC", "BTC", "ETH", "USDT_TRC20", "USDT_ERC20"],
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
