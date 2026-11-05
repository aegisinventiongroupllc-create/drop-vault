import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const schema = z.object({
  kind: z.enum(['withdraw', 'delete_account']),
  reason: z.string().max(1000).optional(),
  confirm: z.literal('WITHDRAW'),
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Withdrawal never deletes provider copies: purchased and archived videos stay in Bunny,
// but copies are marked 'withdrawn' so no playback token is ever signed for them again.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return json({ error: 'Unavailable' }, 503);
    const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
    if (!token) return json({ error: 'Sign in required' }, 401);
    const db = createClient(url, key);
    const { data: claims, error } = await db.auth.getClaims(token);
    const uid = claims?.claims?.sub;
    if (error || !uid) return json({ error: 'Sign in required' }, 401);
    let body: unknown;
    try { body = await req.json(); } catch { return json({ error: 'Invalid request' }, 400); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return json({ error: 'Invalid request' }, 400);

    // Atomic: archive records, end teasers, disable stream copies — or change nothing.
    const { data: wid, error: recErr } = await db.rpc('record_creator_withdrawal', {
      _creator: uid, _kind: parsed.data.kind, _reason: parsed.data.reason ?? null,
    });
    if (recErr || !wid) return json({ error: 'Withdrawal could not be recorded. Nothing was changed.' }, 500);

    // Verify the outcome independently before reporting success.
    const [copies, live] = await Promise.all([
      db.from('bunny_video_deliveries').select('state').eq('creator_id', uid),
      db.from('creator_media').select('id', { count: 'exact', head: true }).eq('creator_id', uid).gt('active_until', new Date().toISOString()),
    ]);
    if (copies.error || live.error) {
      await db.from('creator_consent_withdrawals').update({ status: 'completed_with_errors' }).eq('id', wid);
      return json({ error: 'Withdrawal recorded but could not be verified. An administrator will review it.', withdrawal_id: wid }, 500);
    }
    const disabled = (copies.data ?? []).filter((c) => c.state === 'withdrawn').length;
    const failed = (copies.data ?? []).length - disabled + (live.count ?? 0);
    await db.from('creator_consent_withdrawals').update({
      provider_removed: disabled, provider_failed: failed,
      status: failed ? 'completed_with_errors' : 'completed', completed_at: new Date().toISOString(),
    }).eq('id', wid);
    if (failed) return json({ error: 'Some media could not be confirmed disabled. An administrator will review it.', withdrawal_id: wid }, 500);
    return json({ success: true, disabled, kind: parsed.data.kind });
  } catch {
    return json({ error: 'Withdrawal unavailable. Nothing was changed.' }, 503);
  }
});
