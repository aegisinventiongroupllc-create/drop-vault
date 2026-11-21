import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { liveCheckoutEnabled } from '../_shared/paymentReadiness.ts';
import { waitlistInvitationsOpen } from '../_shared/waitlistInvitations.ts';
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts';

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
function ready() {
  const cryptoReady = liveCheckoutEnabled({ credentialsPresent: Boolean(Deno.env.get('CRYPTOCLOUD_SHOP_ID') && Deno.env.get('CRYPTOCLOUD_API_KEY')), webhookSecret: Deno.env.get('CRYPTOCLOUD_SECRET_KEY') ?? '', approval: Deno.env.get('DTT_TRYBIT_LIVE_APPROVED'), checkoutVerified: Deno.env.get('DTT_TRYBIT_CHECKOUT_VERIFIED') });
  const cardReady = liveCheckoutEnabled({ credentialsPresent: ['CCBILL_ACCOUNT','CCBILL_SUBACCOUNT','CCBILL_FLEXFORM_ID','CCBILL_SALT'].every(key => Boolean(Deno.env.get(key))), webhookSecret: Deno.env.get('CCBILL_WEBHOOK_SECRET') ?? '', approval: Deno.env.get('DTT_CCBILL_LIVE_APPROVED'), checkoutVerified: Deno.env.get('DTT_CCBILL_CHECKOUT_VERIFIED') });
  return waitlistInvitationsOpen(cryptoReady, cardReady) && Boolean(Deno.env.get('LOVABLE_API_KEY'));
}
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return json({ error: 'Invitations unavailable' }, 503);
    const server = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json().catch(() => null);
    const { data: session, error: authError } = await server.auth.getUser((req.headers.get('Authorization') ?? '').replace(/^Bearer /, ''));
    // Status for non-admins is simply "locked": no data revealed, no crash in passcode previews.
    if (authError || !session.user) return body?.action === 'status' ? json({ enabled: false }) : json({ error: 'Sign in required' }, 401);
    const { data: admin, error: roleError } = await server.rpc('has_role', { _user_id: session.user.id, _role: 'admin' });
    if (roleError || admin !== true) return body?.action === 'status' ? json({ enabled: false }) : json({ error: 'Administrator account required' }, 403);
    if (!body || !['status','send'].includes(body.action) || (body.action === 'send' && body.confirm !== true)) return json({ error: 'Confirm the invitation action' }, 400);
    const enabled = ready();
    if (body.action === 'status') return json({ enabled });
    if (!enabled) return json({ error: 'Invitations open after launch and verified payment readiness.', enabled: false }, 409);
    const { error: startError } = await server.rpc('start_customer_waitlist_campaign', { _actor: session.user.id });
    if (startError) throw startError;
    const { data: batch, error: batchError } = await server.rpc('customer_waitlist_campaign_batch');
    if (batchError) throw batchError;
    // At most 25 recipients per request; bounded parallelism and durable retries.
    const rows = batch ?? [];
    let sent = 0; let failed = 0;
    for (let offset = 0; offset < rows.length; offset += 3) {
      await Promise.all(rows.slice(offset, offset + 3).map(async row => {
        let state = 'no_email';
        if (row.email) {
          if (!ready()) state = 'pending';
          else try { const result = await sendTemplateEmail('customer-pay-now', row.email, { idempotencyKey: `dtt-waitlist-launch-${row.user_id}`, replyTo: 'dropthatthingmedia@gmail.com' }); state = result.sent ? 'sent' : 'suppressed'; } catch { state = 'failed'; }
        }
        const { error } = await server.from('customer_waitlist_delivery').update({ state, sent_at: state === 'sent' ? new Date().toISOString() : null }).eq('user_id', row.user_id);
        if (error) throw error;
        if (state === 'sent') sent++; else if (state !== 'pending') failed++;
      }));
    }
    return json({ processed: rows.length, sent, failed });
  } catch { return json({ error: 'Invitation progress could not be completed. Saved progress is retained; please retry.' }, 503); }
});