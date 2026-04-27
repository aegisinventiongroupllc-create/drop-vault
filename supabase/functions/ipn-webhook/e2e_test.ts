import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const IPN_SECRET = Deno.env.get("NOWPAYMENTS_IPN_SECRET")!;

function buildSortedBody(payload: Record<string, unknown>): string {
  return JSON.stringify(
    Object.keys(payload)
      .sort()
      .reduce((obj: Record<string, unknown>, key) => {
        obj[key] = payload[key];
        return obj;
      }, {})
  );
}

async function hmacSha512Hex(body: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.test("E2E: IPN 'finished' webhook credits buyer's token balance", async () => {
  assert(SUPABASE_URL, "SUPABASE_URL must be set");
  assert(SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY must be set");
  assert(IPN_SECRET, "NOWPAYMENTS_IPN_SECRET must be set");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1. Create an ephemeral test user
  const testEmail = `e2e-ipn-${Date.now()}@test.dropthatthing.local`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: testEmail,
    password: crypto.randomUUID(),
    email_confirm: true,
  });
  assertEquals(createErr, null, `createUser failed: ${createErr?.message}`);
  const userId = created.user!.id;

  try {
    // 2. Read starting balance (likely 0/none)
    const { data: startingBal } = await admin
      .from("token_balances")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    const startBalance = startingBal?.balance ?? 0;

    // 3. Fabricate a finished IPN payload (matches order_id contract)
    const tokensToCredit = 5;
    const invoiceUsd = 101;
    const paymentId = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const orderId = `dtt-${Date.now()}-${tokensToCredit}-${userId}`;

    const payload = {
      payment_id: paymentId,
      payment_status: "finished",
      order_id: orderId,
      price_amount: invoiceUsd,
      price_currency: "usd",
      pay_amount: 0.5,
      pay_currency: "ltc",
      actually_paid: 0.5,
      outcome_amount: 0.5,
      outcome_currency: "ltc",
    };

    const sortedBody = buildSortedBody(payload);
    const signature = await hmacSha512Hex(sortedBody, IPN_SECRET);

    // 4. POST to the live ipn-webhook
    const webhookUrl = `${SUPABASE_URL}/functions/v1/ipn-webhook`;
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-nowpayments-sig": signature,
      },
      body: sortedBody,
    });
    const responseJson = await res.json();
    assertEquals(res.status, 200, `webhook status not 200: ${JSON.stringify(responseJson)}`);
    assertEquals(responseJson.ok, true);
    assertEquals(responseJson.tokens_credited, true, "expected tokens_credited=true in response");
    assertEquals(responseJson.buyer_id, userId);

    // 5. Verify token_balances updated
    const { data: newBal, error: balErr } = await admin
      .from("token_balances")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    assertEquals(balErr, null);
    assert(newBal, "token_balances row should exist after credit");
    assertEquals(
      newBal!.balance,
      startBalance + tokensToCredit,
      `expected balance ${startBalance + tokensToCredit}, got ${newBal!.balance}`
    );

    // 6. Verify token_purchases history row exists
    const { data: purchase, error: purchErr } = await admin
      .from("token_purchases")
      .select("user_id, payment_id, tokens_credited, amount_usd, status")
      .eq("payment_id", paymentId)
      .single();
    assertEquals(purchErr, null);
    assertEquals(purchase!.user_id, userId);
    assertEquals(purchase!.tokens_credited, tokensToCredit);
    assertEquals(Number(purchase!.amount_usd), invoiceUsd);
    assertEquals(purchase!.status, "finished");

    // 7. Idempotency: re-POST same IPN — balance must NOT double-credit
    const res2 = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-nowpayments-sig": signature },
      body: sortedBody,
    });
    const res2Json = await res2.json();
    assertEquals(res2.status, 200, `replay status not 200: ${JSON.stringify(res2Json)}`);
    assertEquals(res2Json.tokens_credited, false, "replay must report tokens_credited=false");

    const { data: balAfterReplay } = await admin
      .from("token_balances")
      .select("balance")
      .eq("user_id", userId)
      .single();
    assertEquals(
      balAfterReplay!.balance,
      startBalance + tokensToCredit,
      "balance must not double-credit on replay"
    );
  } finally {
    // Cleanup: delete purchase rows + user
    await admin.from("token_purchases").delete().eq("user_id", userId);
    await admin.from("token_balances").delete().eq("user_id", userId);
    await admin.from("transactions").delete().eq("buyer_id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
});