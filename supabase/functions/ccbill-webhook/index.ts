import { createClient } from "npm:@supabase/supabase-js@2";

// CCBill webhooks are unsigned, so we (1) only accept CCBill's published IP ranges,
// (2) re-check the billed amount against our own price catalog, and
// (3) credit idempotently by CCBill transaction id.
const CCBILL_RANGES = ["64.38.212.", "64.38.215.", "64.38.240.", "64.38.241."];
const PRICE_FOR_TOKENS: Record<number, number> = { 1: 21, 5: 101 };

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok({ error: "method not allowed" }, 405);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  if (!CCBILL_RANGES.some((r) => ip.startsWith(r))) {
    console.warn("ccbill webhook rejected ip", ip);
    return ok({ error: "forbidden" }, 403);
  }

  const url = new URL(req.url);
  const eventType = url.searchParams.get("eventType") ?? "";
  const payload: Record<string, string> = {};
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) Object.assign(payload, await req.json());
  else for (const [k, v] of (await req.formData()).entries()) payload[k] = String(v);

  if (eventType === "Chargeback") {
    const txId = payload.transactionId ?? "";
    if (!txId) return ok({ error: "missing transaction" }, 400);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await sb.rpc("handle_chargeback", { _payment_id: `ccbill-${txId}`, _reason: "chargeback" });
    if (error) { console.error("handle_chargeback error", error); return ok({ error: "chargeback failed" }, 500); }
    return ok({ ok: true, locked: data });
  }
  if (eventType !== "NewSaleSuccess") return ok({ ok: true, ignored: eventType });

  const field = (k: string) => payload[k] ?? payload[`X-${k}`] ?? payload[`x-${k}`] ?? "";
  const userId = field("dtt_user");
  const tokens = parseInt(field("dtt_tokens"), 10);
  const transactionId = payload.transactionId ?? payload.subscriptionId ?? "";
  const billed = parseFloat(payload.billedInitialPrice ?? payload.accountingInitialPrice ?? "0");

  const expected = PRICE_FOR_TOKENS[tokens];
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !expected || !transactionId) return ok({ error: "invalid sale" }, 400);
  if (Math.abs(billed - expected) > 0.01) {
    console.error("ccbill amount mismatch", { transactionId, tokens, billed });
    return ok({ error: "amount mismatch" }, 400);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Vault Entry Pass sales: $20 flat, no tokens.
  if (field("dtt_pkg") === "entry_pass") {
    if (!/^[0-9a-f-]{36}$/i.test(userId) || !transactionId) return ok({ error: "invalid sale" }, 400);
    if (Math.abs(billed - 20.00) > 0.01) {
      console.error("ccbill pass amount mismatch", { transactionId, billed });
      return ok({ error: "amount mismatch" }, 400);
    }
    const { error } = await supabase.rpc("credit_entry_pass", {
      _user_id: userId,
      _payment_id: `ccbill-${transactionId}`,
      _amount_usd: billed,
      _method: "card",
    });
    if (error) {
      console.error("credit_entry_pass error", error);
      return ok({ error: "credit failed" }, 500);
    }
    return ok({ ok: true, entry_pass: true });
  }

  const expected = PRICE_FOR_TOKENS[tokens];
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !expected || !transactionId) return ok({ error: "invalid sale" }, 400);
  if (Math.abs(billed - expected) > 0.01) {
    console.error("ccbill amount mismatch", { transactionId, tokens, billed });
    return ok({ error: "amount mismatch" }, 400);
  }

  // Card kept on file: store the processor's customer reference (never raw card data)
  // when the customer asked us to remember the card.
  const customerRef = payload.customerRef ?? payload.customer_ref ?? "";
  if (customerRef) {
    const last4 = typeof payload.creditCardNum === "string" && payload.creditCardNum.length >= 4
      ? payload.creditCardNum.slice(-4)
      : null;
    await supabase
      .from("saved_payment_methods")
      .upsert(
        {
          user_id: userId,
          processor: "ccbill",
          processor_token: String(customerRef),
          last4,
          brand: payload.creditCardType ?? null,
        },
        { onConflict: "user_id" }
      );
  }

  const { data, error } = await supabase.rpc("credit_tokens", {
    _user_id: userId,
    _payment_id: `ccbill-${transactionId}`,
    _tokens: tokens,
    _amount_usd: billed,
  });
  if (error) {
    console.error("credit_tokens error", error);
    return ok({ error: "credit failed" }, 500);
  }
  return ok({ ok: true, tokens_credited: data });
});
