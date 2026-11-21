import { createClient } from "npm:@supabase/supabase-js@2";
import { notifyCreatorSignup } from "./creatorSignupNotification.ts";
import { sendTemplateEmail } from "./transactional-email-templates/send-email.ts";

/** Called only with a verified auth-hook email or authenticated account ID. */
export async function sendCreatorSignupNotice(identity: { email: string } | { userId: string }) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Creator notification configuration unavailable");
  const service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let query = service.from("account_preferences").select("user_id,email,account_type,created_at");
  query = "userId" in identity ? query.eq("user_id", identity.userId) : query.eq("email", identity.email.toLowerCase());
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error("Creator signup lookup unavailable");
  if (!data) return { sent: false, skipped: true };
  return notifyCreatorSignup(data, sendTemplateEmail);
}