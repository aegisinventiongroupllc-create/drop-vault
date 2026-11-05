import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { bunnyApi } from '../_shared/bunnyStream.ts';

const schema = z.object({
  kind: z.enum(['withdraw', 'delete_account']),
  reason: z.string().max(1000).optional(),
  confirm: z.literal('WITHDRAW'),
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Invalid request' }, 400);

    const { data: wid, error: recErr } = await db.rpc('record_creator_withdrawal', {
      _creator: uid, _kind: parsed.data.kind, _reason: parsed.data.reason ?? null,
    });
    if (recErr || !wid) return json({ error: 'Withdrawal could not be recorded' }, 500);

    // Remove public delivery copies; private originals and compliance records are retained.
    const { data: copies } = await db.from('bunny_video_deliveries').select('id,video_id').eq('creator_id', uid);
    let removed = 0, failed = 0;
    for (const c of copies ?? []) {
      try {
        await bunnyApi(`/videos/${c.video_id}`, 'DELETE');
        await db.from('bunny_video_deliveries').delete().eq('id', c.id);
        removed++;
      } catch { failed++; }
    }
    await db.from('creator_consent_withdrawals').update({
      provider_removed: removed, provider_failed: failed,
      status: failed ? 'completed_with_errors' : 'completed', completed_at: new Date().toISOString(),
    }).eq('id', wid);
    return json({ success: true, removed, failed, kind: parsed.data.kind });
  } catch {
    return json({ error: 'Withdrawal unavailable' }, 503);
  }
});
