import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex === signature;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const ipnSecret = Deno.env.get('NOWPAYMENTS_IPN_SECRET');
    if (!ipnSecret) {
      console.error('IPN Secret not configured');
      return new Response(JSON.stringify({ error: 'IPN not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-nowpayments-sig');

    if (!signature) {
      console.error('Missing IPN signature');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // NOWPayments signs sorted JSON keys
    const parsed = JSON.parse(rawBody);
    const sortedBody = JSON.stringify(Object.keys(parsed).sort().reduce((obj: Record<string, unknown>, key: string) => {
      obj[key] = parsed[key];
      return obj;
    }, {}));

    const valid = await verifySignature(sortedBody, signature, ipnSecret);
    if (!valid) {
      console.error('Invalid IPN signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { payment_id, payment_status, order_id, price_amount, actually_paid, pay_currency, outcome_amount } = parsed;

    console.log(`IPN received: payment_id=${payment_id}, status=${payment_status}, order_id=${order_id}`);

    // ONLY process completed payments
    if (payment_status !== 'finished' && payment_status !== 'partially_paid') {
      console.log(`Ignoring IPN with status: ${payment_status}`);
      return new Response(JSON.stringify({ ok: true, status: 'ignored', reason: `Status ${payment_status} not actionable` }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Connect to Supabase with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Extract creator_id from order_id if present (format: dtt-{timestamp}-{creatorId})
    const orderParts = (order_id || '').split('-');
    const creatorId = orderParts.length >= 3 ? orderParts.slice(2).join('-') : null;

    // Calculate platform split (10% platform, 90% creator)
    const amountUsd = Number(price_amount) || 0;
    const creatorSharePercent = 90;
    const creatorShareUsd = amountUsd * (creatorSharePercent / 100);
    const platformShareUsd = amountUsd - creatorShareUsd;

    // Record the transaction
    const { error: txError } = await supabase.from('transactions').insert({
      payment_id: String(payment_id),
      amount_usd: amountUsd,
      creator_id: creatorId || '00000000-0000-0000-0000-000000000000',
      creator_share_percent: creatorSharePercent,
      creator_share_usd: creatorShareUsd,
      platform_share_usd: platformShareUsd,
      status: payment_status,
    });

    if (txError) {
      console.error('Transaction insert error:', txError);
    }

    // Update creator wallet pending balance if creator is identified
    if (creatorId) {
      const { data: wallet } = await supabase
        .from('creator_wallets')
        .select('pending_balance, total_earned')
        .eq('user_id', creatorId)
        .single();

      if (wallet) {
        await supabase.from('creator_wallets').update({
          pending_balance: wallet.pending_balance + creatorShareUsd,
          total_earned: wallet.total_earned + creatorShareUsd,
          updated_at: new Date().toISOString(),
        }).eq('user_id', creatorId);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      payment_id,
      status: payment_status,
      amount_usd: amountUsd,
      creator_share: creatorShareUsd,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('IPN webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
