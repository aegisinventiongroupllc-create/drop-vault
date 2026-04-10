const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1';
// Payout address configured in NOWPayments dashboard settings

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('NOWPAYMENTS_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { amount_usd, tokens, order_id, pay_currency } = await req.json();

    if (!amount_usd || !tokens || !pay_currency) {
      return new Response(JSON.stringify({ error: 'Missing required fields: amount_usd, tokens, pay_currency' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create payment via NOWPayments API
    const paymentResponse = await fetch(`${NOWPAYMENTS_API_URL}/payment`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: amount_usd,
        price_currency: 'usd',
        pay_currency: pay_currency,
        order_id: order_id || `dtt-${Date.now()}`,
        order_description: `${tokens} Bit-Token${tokens > 1 ? 's' : ''} - DropThatThing`,
        is_fixed_rate: true,
        is_fee_paid_by_user: true,
      }),
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.error('NOWPayments error:', paymentData);
      return new Response(JSON.stringify({ error: 'Payment creation failed', details: paymentData }), {
        status: paymentResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      payment_id: paymentData.payment_id,
      payment_status: paymentData.payment_status,
      pay_address: paymentData.pay_address,
      pay_amount: paymentData.pay_amount,
      pay_currency: paymentData.pay_currency,
      order_id: paymentData.order_id,
      tokens_to_credit: tokens,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Payment error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
