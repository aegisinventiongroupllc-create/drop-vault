const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1';

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

    const { amount_usd, tokens, order_id, pay_currency, is_fiat } = await req.json();

    if (!amount_usd || !tokens) {
      return new Response(JSON.stringify({ error: 'Missing required fields: amount_usd, tokens' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build payment request body
    const paymentBody: Record<string, unknown> = {
      price_amount: amount_usd,
      price_currency: 'usd',
      pay_currency: pay_currency || 'ltc',
      order_id: order_id || `dtt-${Date.now()}`,
      order_description: `${tokens} Bit-Token${tokens > 1 ? 's' : ''} - DropThatThing`,
      is_fixed_rate: true,
      is_fee_paid_by_user: true,
      // Force all settlements to LTC regardless of input currency
      outcome_currency: 'ltc',
    };

    // For fiat on-ramp (card payments), use the invoice endpoint
    if (is_fiat) {
      const invoiceResponse = await fetch(`${NOWPAYMENTS_API_URL}/invoice`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_amount: amount_usd,
          price_currency: 'usd',
          order_id: paymentBody.order_id,
          order_description: paymentBody.order_description,
          is_fixed_rate: true,
          is_fee_paid_by_user: true,
          // Force outcome to LTC
          outcome_currency: 'ltc',
        }),
      });

      const invoiceData = await invoiceResponse.json();

      if (!invoiceResponse.ok) {
        console.error('NOWPayments invoice error:', invoiceData);
        return new Response(JSON.stringify({ error: 'Invoice creation failed', details: invoiceData }), {
          status: invoiceResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        invoice_id: invoiceData.id,
        invoice_url: invoiceData.invoice_url,
        order_id: invoiceData.order_id,
        tokens_to_credit: tokens,
        is_fiat: true,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Standard crypto payment
    const paymentResponse = await fetch(`${NOWPAYMENTS_API_URL}/payment`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentBody),
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
