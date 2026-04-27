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

// Dual-Bucket "Tax then Split" constants
const ADMIN_FEE_USD = 1;
const PLATFORM_SPLIT_PERCENT = 10;
const CREATOR_SPLIT_PERCENT = 90;

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

    const { payment_id, payment_status, order_id, price_amount } = parsed;

    console.log(`IPN received: payment_id=${payment_id}, status=${payment_status}, order_id=${order_id}`);

    if (payment_status !== 'finished' && payment_status !== 'partially_paid') {
      console.log(`Ignoring IPN with status: ${payment_status}`);
      return new Response(JSON.stringify({ ok: true, status: 'ignored', reason: `Status ${payment_status} not actionable` }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Parse order_id formats:
    //   Token purchase: dtt-{timestamp}-{tokens}-{userId}
    //   Legacy/creator: dtt-{timestamp}-{creatorId}
    const orderParts = (order_id || '').split('-');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let buyerUserId: string | null = null;
    let tokensToCredit = 0;
    let creatorId: string | null = null;

    if (orderParts.length >= 7) {
      // Token purchase: prefix(1) + timestamp(1) + tokens(1) + uuid(5) = 8 parts after split('-')
      // Actually: ["dtt", "{ts}", "{tokens}", uuid1, uuid2, uuid3, uuid4, uuid5]
      const maybeTokens = parseInt(orderParts[2], 10);
      const maybeUuid = orderParts.slice(3).join('-');
      if (!isNaN(maybeTokens) && uuidRegex.test(maybeUuid)) {
        buyerUserId = maybeUuid;
        tokensToCredit = maybeTokens;
      }
    }
    if (!buyerUserId && orderParts.length >= 3) {
      // Legacy creator-payment format
      const maybeUuid = orderParts.slice(2).join('-');
      if (uuidRegex.test(maybeUuid)) creatorId = maybeUuid;
    }

    // Dual-Bucket calculation
    const invoiceAmount = Number(price_amount) || 0;
    const entryTax = ADMIN_FEE_USD; // $1 flat to Admin_Profit_Vault
    const baseAmount = invoiceAmount - entryTax; // e.g. $20 from $21
    const platformCommission = baseAmount * (PLATFORM_SPLIT_PERCENT / 100); // 10% of base
    const creatorShareUsd = baseAmount * (CREATOR_SPLIT_PERCENT / 100); // 90% of base
    const totalPlatformRevenue = entryTax + platformCommission;

    console.log(`Dual-Bucket: invoice=$${invoiceAmount}, tax=$${entryTax}, base=$${baseAmount}, commission=$${platformCommission}, creator=$${creatorShareUsd}`);

    // === TOKEN PURCHASE: credit buyer's wallet atomically ===
    let tokensCredited = false;
    if (buyerUserId && tokensToCredit > 0) {
      const { data: creditResult, error: creditError } = await supabase.rpc('credit_tokens', {
        _user_id: buyerUserId,
        _payment_id: String(payment_id),
        _tokens: tokensToCredit,
        _amount_usd: invoiceAmount,
      });
      if (creditError) {
        console.error('credit_tokens RPC error:', creditError);
      } else {
        tokensCredited = creditResult === true;
        console.log(`Tokens credited to ${buyerUserId}: ${tokensCredited} (${tokensToCredit} tokens)`);
      }
    }

    // Record the transaction with separate entry_tax and platform_commission
    const { error: txError } = await supabase.from('transactions').insert({
      payment_id: String(payment_id),
      amount_usd: invoiceAmount,
      creator_id: creatorId || '00000000-0000-0000-0000-000000000000',
      buyer_id: buyerUserId,
      creator_share_percent: CREATOR_SPLIT_PERCENT,
      creator_share_usd: creatorShareUsd,
      platform_share_usd: totalPlatformRevenue,
      entry_tax: entryTax,
      platform_commission: platformCommission,
      status: payment_status,
    });

    if (txError) {
      console.error('Transaction insert error:', txError);
    }

    // Update creator wallet (only for legacy creator-payment flow, not token purchases)
    if (creatorId && !buyerUserId) {
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
      invoice_amount: invoiceAmount,
      entry_tax: entryTax,
      platform_commission: platformCommission,
      creator_share: creatorShareUsd,
      tokens_credited: tokensCredited,
      buyer_id: buyerUserId,
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
