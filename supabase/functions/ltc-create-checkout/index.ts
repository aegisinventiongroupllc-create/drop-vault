import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fetch live LTC/USD price from CoinGecko (free, no key)
async function getLtcUsdPrice(): Promise<number> {
  const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=usd');
  const j = await r.json();
  const price = j?.litecoin?.usd;
  if (!price || typeof price !== 'number') throw new Error('Could not fetch LTC price');
  return price;
}

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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabaseAuth.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { amount_usd, tokens } = await req.json();
    if (!amount_usd || !tokens) {
      return new Response(JSON.stringify({ error: 'Missing amount_usd or tokens' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ltcPrice = await getLtcUsdPrice();
    const baseLtc = Number(amount_usd) / ltcPrice;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Make the amount unique by adding a tiny random "tip" (0.00000001 - 0.00000999 LTC)
    // so we can match incoming transactions to a specific buyer.
    let ltcAmount = 0;
    let inserted: any = null;
    let lastErr: string | null = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const tip = (Math.floor(Math.random() * 999) + 1) / 1e8; // 1..999 satoshis
      ltcAmount = Number((baseLtc + tip).toFixed(8));

      const { data, error } = await supabaseAdmin
        .from('pending_ltc_payments')
        .insert({
          user_id: userId,
          tokens: Number(tokens),
          amount_usd: Number(amount_usd),
          ltc_amount: ltcAmount,
          ltc_address: ltcAddress,
          status: 'pending',
        })
        .select()
        .single();

      if (!error) { inserted = data; break; }
      lastErr = error.message;
    }
    if (!inserted) {
      return new Response(JSON.stringify({ error: 'Could not create checkout', details: lastErr }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      payment_id: inserted.id,
      ltc_address: ltcAddress,
      ltc_amount: ltcAmount,
      ltc_price_usd: ltcPrice,
      amount_usd,
      tokens,
      expires_at: inserted.expires_at,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('ltc-create-checkout error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});