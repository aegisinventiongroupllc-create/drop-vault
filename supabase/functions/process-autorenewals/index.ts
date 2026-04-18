// Hourly cron: warn customers 24h before access expires, then auto-renew if Autopay is on.
// Renewal: deduct 1 Bit-Token from token_balances, extend expires_at by 14 days,
// log a transaction (90% creator / 10% platform of the $20 base value), credit creator wallet.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const TOKEN_BASE_USD = 20;
const CREATOR_PCT = 90;
const PLATFORM_PCT = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  let warned = 0;
  let renewed = 0;
  let failed = 0;

  try {
    // 1. 24h pre-expiry warning
    const { data: warnings } = await supabase
      .from("subscriptions")
      .select("id, customer_id, creator_name")
      .eq("status", "active")
      .eq("warned_24h", false)
      .lte("expires_at", in24h)
      .gt("expires_at", nowIso);

    if (warnings && warnings.length) {
      const ids = warnings.map((w) => w.id);
      await supabase.from("subscriptions").update({ warned_24h: true }).in("id", ids);
      warned = warnings.length;
      // (Email/push hook would go here — toast surfaces in-app via subscriptions polling.)
    }

    // 2. Renewals for expired + autorenew
    const { data: due } = await supabase
      .from("subscriptions")
      .select("id, customer_id, creator_id, creator_name, expires_at")
      .eq("status", "active")
      .eq("autorenew", true)
      .lte("expires_at", nowIso);

    for (const sub of due ?? []) {
      const { data: bal } = await supabase
        .from("token_balances")
        .select("balance")
        .eq("user_id", sub.customer_id)
        .maybeSingle();

      if (!bal || bal.balance < 1) {
        // Out of tokens — flip autorenew off and mark expired
        await supabase
          .from("subscriptions")
          .update({ status: "expired", autorenew: false })
          .eq("id", sub.id);
        failed++;
        continue;
      }

      // Deduct 1 token
      const { error: balErr } = await supabase
        .from("token_balances")
        .update({ balance: bal.balance - 1 })
        .eq("user_id", sub.customer_id);
      if (balErr) { failed++; continue; }

      const newExpiry = new Date(now.getTime() + FOURTEEN_DAYS_MS).toISOString();

      // Extend subscription
      await supabase
        .from("subscriptions")
        .update({
          expires_at: newExpiry,
          last_renewed_at: nowIso,
          renewal_count: ((sub as any).renewal_count ?? 0) + 1,
          warned_24h: false,
        })
        .eq("id", sub.id);

      // Log transaction (90/10 of $20 base)
      const creatorShare = TOKEN_BASE_USD * (CREATOR_PCT / 100);
      const platformShare = TOKEN_BASE_USD * (PLATFORM_PCT / 100);
      await supabase.from("transactions").insert({
        amount_usd: TOKEN_BASE_USD,
        creator_id: sub.creator_id,
        buyer_id: sub.customer_id,
        creator_share_usd: creatorShare,
        platform_share_usd: platformShare,
        creator_share_percent: CREATOR_PCT,
        platform_commission: PLATFORM_PCT,
        status: "completed",
        payment_id: `autorenew-${sub.id}-${now.getTime()}`,
      });

      // Credit creator wallet
      const { data: wallet } = await supabase
        .from("creator_wallets")
        .select("pending_balance, total_earned")
        .eq("user_id", sub.creator_id)
        .maybeSingle();
      if (wallet) {
        await supabase
          .from("creator_wallets")
          .update({
            pending_balance: Number(wallet.pending_balance) + creatorShare,
            total_earned: Number(wallet.total_earned) + creatorShare,
          })
          .eq("user_id", sub.creator_id);
      } else {
        await supabase.from("creator_wallets").insert({
          user_id: sub.creator_id,
          pending_balance: creatorShare,
          total_earned: creatorShare,
        });
      }

      renewed++;
    }

    return new Response(
      JSON.stringify({ ok: true, warned, renewed, failed, ranAt: nowIso }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
