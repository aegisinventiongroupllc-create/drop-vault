import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHOP_ID = Deno.env.get("CRYPTOCLOUD_SHOP_ID")!;
const API_KEY = Deno.env.get("CRYPTOCLOUD_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { amount_usd, tokens } = await req.json();
    if (!amount_usd || !tokens) {
      return new Response(JSON.stringify({ error: "Missing amount_usd or tokens" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      return new Response(JSON.stringify({ error: ccJson?.result?.message || "CryptoCloud invoice creation failed", details: ccJson }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invoice = ccJson.result;
    return new Response(
      JSON.stringify({
        invoice_url: invoice.link,
        invoice_id: invoice.uuid,
        order_id: orderId,
        amount_usd,
        tokens,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});