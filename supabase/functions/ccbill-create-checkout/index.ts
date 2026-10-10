import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { crypto as stdCrypto } from "jsr:@std/crypto@1";
import { encodeHex } from "jsr:@std/encoding@1/hex";

// Server-side price catalog. The browser may only pick a package, never a price.
const TOKEN_PACKAGES: Record<string, { price: string; tokens: number }> = {
  single: { price: "21.00", tokens: 1 },
  bundle: { price: "101.00", tokens: 5 },
  entry_pass: { price: "20.00", tokens: 0 },
};
const INITIAL_PERIOD = "2"; // one-time sale; access length is enforced by our own 14-day logic
const CURRENCY_USD = "840";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const env = () => ({
  account: Deno.env.get("CCBILL_ACCOUNT") ?? "",
  subaccount: Deno.env.get("CCBILL_SUBACCOUNT") ?? "",
  flexformId: Deno.env.get("CCBILL_FLEXFORM_ID") ?? "",
  salt: Deno.env.get("CCBILL_SALT") ?? "",
});

const md5 = async (s: string) =>
  encodeHex(await stdCrypto.subtle.digest("MD5", new TextEncoder().encode(s)));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const cfg = env();
  const configured = Boolean(cfg.account && cfg.subaccount && cfg.flexformId && cfg.salt);

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.probe === true) return json({ configured });
    if (!configured) return json({ error: "Card payments are coming soon.", configured: false }, 503);

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const pkg = TOKEN_PACKAGES[String(body?.package ?? "")];
    if (!pkg) return json({ error: "Unknown token package" }, 400);
    const isEntryPass = String(body?.package ?? "") === "entry_pass";

    const formDigest = await md5(`${pkg.price}${INITIAL_PERIOD}${CURRENCY_USD}${cfg.salt}`);
    const params = new URLSearchParams({
      clientAccnum: cfg.account,
      clientSubacc: cfg.subaccount,
      initialPrice: pkg.price,
      initialPeriod: INITIAL_PERIOD,
      currencyCode: CURRENCY_USD,
      formDigest,
      dtt_user: userData.user.id,
    });
    if (isEntryPass) params.set("dtt_pkg", "entry_pass");
    else params.set("dtt_tokens", String(pkg.tokens));
    if (body?.savecard === true) params.set("dtt_savecard", "1");
    if (userData.user.email) params.set("customer_email", userData.user.email);

    return json({
      checkout_url: `https://api.ccbill.com/wap-frontflex/flexforms/${encodeURIComponent(cfg.flexformId)}?${params}`,
      tokens: pkg.tokens,
      amount_usd: Number(pkg.price),
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Checkout could not be started" }, 500);
  }
});
