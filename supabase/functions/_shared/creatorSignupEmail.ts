import { createClient } from "npm:@supabase/supabase-js@2";
import { notifyCreatorSignup } from "./creatorSignupNotification.ts";
import { sendTemplateEmail } from "./transactional-email-templates/send-email.ts";
import { signupProgressNotice, type SignupEvent, type SignupStep } from './signupProgress.ts';

/** Called only with a verified auth-hook email or authenticated account ID. */
export async function sendCreatorSignupNotice(identity: { email: string } | { userId: string }, event?: SignupEvent, step?: SignupStep) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Creator notification configuration unavailable");
  const service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let query = service.from("account_preferences").select("user_id,email,account_type,created_at");
  query = "userId" in identity ? query.eq("user_id", identity.userId) : query.eq("email", identity.email.toLowerCase());
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error("Creator signup lookup unavailable");
  if (!data) return { sent: false, skipped: true };
  if (!event && data.account_type === 'customer') {
    const notice = signupProgressNotice({ userId: data.user_id, email: data.email, accountType: data.account_type, createdAt: data.created_at, confirmed: false, creatorDetailsSaved: false, waitlistJoined: false }, 'started');
    if (!notice) return { sent: false, skipped: true };
    return sendTemplateEmail('signup-progress', notice.recipient, { templateData: notice.templateData, idempotencyKey: notice.idempotencyKey });
  }
  if (event) {
    const [{ data: auth, error: authError }, { data: profile, error: profileError }, { data: waitlist, error: waitlistError }] = await Promise.all([
      service.auth.admin.getUserById(data.user_id),
      service.from('profiles').select('vault_side,content_labels').eq('user_id', data.user_id).maybeSingle(),
      service.from('customer_launch_waitlist').select('user_id').eq('user_id', data.user_id).maybeSingle(),
    ]);
    if (authError || profileError || waitlistError || !auth.user?.email) throw new Error('Signup progress lookup unavailable');
    const notice = signupProgressNotice({ userId: data.user_id, email: auth.user.email, accountType: data.account_type, createdAt: data.created_at, confirmed: Boolean(auth.user.email_confirmed_at), creatorDetailsSaved: ['women','men','trans_women','trans_men'].includes(profile?.vault_side ?? '') && Boolean(profile?.content_labels?.length), waitlistJoined: Boolean(waitlist) }, event, step);
    if (!notice) return { sent: false, skipped: true };
    return sendTemplateEmail('signup-progress', notice.recipient, { templateData: notice.templateData, idempotencyKey: notice.idempotencyKey });
  }
  return notifyCreatorSignup(data, sendTemplateEmail);
}