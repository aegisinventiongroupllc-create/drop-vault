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

    const url = new URL(req.url);
    const paymentId = url.searchParams.get('payment_id');

    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'Missing payment_id parameter' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const statusResponse = await fetch(`${NOWPAYMENTS_API_URL}/payment/${paymentId}`, {
      headers: { 'x-api-key': apiKey },
    });

    const statusData = await statusResponse.json();

    if (!statusResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to check payment status', details: statusData }), {
        status: statusResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Zero-confirmation: grant tokens as soon as payment is "waiting" or "confirming"
    const instantAccess = ['waiting', 'confirming', 'confirmed', 'sending', 'partially_paid', 'finished'].includes(statusData.payment_status);

    return new Response(JSON.stringify({
      payment_id: statusData.payment_id,
      payment_status: statusData.payment_status,
      pay_amount: statusData.pay_amount,
      actually_paid: statusData.actually_paid,
      instant_access: instantAccess,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Check payment error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
