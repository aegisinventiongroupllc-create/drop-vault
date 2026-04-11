import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    // Verify admin password from request
    const { admin_password } = await req.json();
    if (admin_password !== '052417') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('NOWPAYMENTS_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'NOWPayments API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all creators with pending balance > 0 and a valid LTC address
    const { data: creators, error: fetchError } = await supabase
      .from('creator_wallets')
      .select('*')
      .gt('pending_balance', 0)
      .not('ltc_address', 'is', null)
      .neq('ltc_address', '');

    if (fetchError) {
      console.error('DB fetch error:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch creator wallets', details: fetchError }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!creators || creators.length === 0) {
      return new Response(JSON.stringify({ message: 'No creators with pending balances found', paid: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build NOWPayments mass payout request
    const withdrawals = creators.map((c) => ({
      address: c.ltc_address,
      currency: 'ltc',
      amount: Number(c.pending_balance),
      unique_external_id: c.id,
    }));

    const totalAmount = creators.reduce((sum, c) => sum + Number(c.pending_balance), 0);

    // Create payout batch record
    const { data: batch, error: batchError } = await supabase
      .from('payout_batches')
      .insert({
        total_amount: totalAmount,
        total_creators: creators.length,
        status: 'processing',
        payout_details: { creators: creators.map(c => ({ id: c.id, user_id: c.user_id, amount: c.pending_balance, ltc_address: c.ltc_address })) },
      })
      .select()
      .single();

    if (batchError) {
      console.error('Batch insert error:', batchError);
    }

    // Call NOWPayments Mass Payout API
    const payoutResponse = await fetch(`${NOWPAYMENTS_API_URL}/payout`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ipn_callback_url: `${supabaseUrl}/functions/v1/payout-webhook`,
        withdrawals,
      }),
    });

    const payoutData = await payoutResponse.json();

    if (!payoutResponse.ok) {
      console.error('NOWPayments payout error:', payoutData);
      // Update batch status to failed
      if (batch) {
        await supabase.from('payout_batches').update({ status: 'failed', payout_details: { ...batch.payout_details as any, error: payoutData } }).eq('id', batch.id);
      }
      return new Response(JSON.stringify({ error: 'Mass payout failed', details: payoutData }), {
        status: payoutResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update batch with NOWPayments response
    if (batch) {
      await supabase.from('payout_batches').update({
        status: 'sent',
        nowpayments_batch_id: payoutData.id?.toString() || null,
      }).eq('id', batch.id);
    }

    // Zero out pending balances and add to total_paid
    for (const creator of creators) {
      await supabase
        .from('creator_wallets')
        .update({
          pending_balance: 0,
          total_paid: Number(creator.total_paid) + Number(creator.pending_balance),
          updated_at: new Date().toISOString(),
        })
        .eq('id', creator.id);
    }

    return new Response(JSON.stringify({
      success: true,
      batch_id: batch?.id,
      nowpayments_id: payoutData.id,
      total_amount: totalAmount,
      creators_paid: creators.length,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Mass payout error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
