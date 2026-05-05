import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Polls the Litecoin blockchain via Blockchair (free public API) for incoming
// transactions to the configured wallet, and credits tokens for any pending
// payment whose ltc_amount matches an unspent output.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const ltcAddress = Deno.env.get('LTC_WALLET_ADDRESS');
    if (!ltcAddress) {
      return new Response(JSON.stringify({ error: 'LTC wallet not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Optional: verify a single payment_id (called from client polling)
    let paymentId: string | null = null;
    try {
      const body = await req.json();
      paymentId = body?.payment_id ?? null;
    } catch { /* no body */ }

    // 1. Mark expired pending payments
    await supabaseAdmin
      .from('pending_ltc_payments')
      .update({ status: 'expired' })
      .lt('expires_at', new Date().toISOString())
      .eq('status', 'pending');

    // 2. Pull pending payments
    let q = supabaseAdmin
      .from('pending_ltc_payments')
      .select('*')
      .eq('status', 'pending');
    if (paymentId) q = q.eq('id', paymentId);
    const { data: pending, error: pendingErr } = await q;
    if (pendingErr) throw pendingErr;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ confirmed: [], checked: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Fetch recent transactions for the wallet from Blockchair
    const url = `https://api.blockchair.com/litecoin/dashboards/address/${ltcAddress}?limit=50`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Blockchair fetch failed: ${r.status}`);
    const j = await r.json();
    const txHashes: string[] = j?.data?.[ltcAddress]?.transactions ?? [];

    if (txHashes.length === 0) {
      return new Response(JSON.stringify({ confirmed: [], checked: pending.length }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Fetch tx details (batched) — get outputs sent to our address with exact amounts
    const batchUrl = `https://api.blockchair.com/litecoin/dashboards/transactions/${txHashes.slice(0, 10).join(',')}`;
    const tr = await fetch(batchUrl);
    if (!tr.ok) throw new Error(`Blockchair tx fetch failed: ${tr.status}`);
    const tj = await tr.json();
    const txMap = tj?.data ?? {};

    type Match = { ltc: number; tx: string };
    const incoming: Match[] = [];
    for (const [tx, info] of Object.entries<any>(txMap)) {
      const outs = info?.outputs ?? [];
      for (const o of outs) {
        if (o?.recipient === ltcAddress && typeof o?.value === 'number') {
          // value is in litoshis (1 LTC = 1e8)
          incoming.push({ ltc: o.value / 1e8, tx });
        }
      }
    }

    // 5. For each pending payment, find an incoming tx with matching exact amount
    const confirmed: string[] = [];
    for (const p of pending) {
      const target = Number(p.ltc_amount);
      const match = incoming.find((i) => Math.abs(i.ltc - target) < 1e-9);
      if (!match) continue;

      // Idempotently credit
      const { data: credited } = await supabaseAdmin.rpc('credit_tokens', {
        _user_id: p.user_id,
        _payment_id: `ltc-${p.id}`,
        _tokens: p.tokens,
        _amount_usd: p.amount_usd,
      });

      await supabaseAdmin
        .from('pending_ltc_payments')
        .update({ status: 'confirmed', tx_hash: match.tx })
        .eq('id', p.id);

      confirmed.push(p.id);
    }

    return new Response(JSON.stringify({ confirmed, checked: pending.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('ltc-verify-payment error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});