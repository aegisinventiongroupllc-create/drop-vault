import { createClient } from "npm:@supabase/supabase-js@2";
import { sendTemplateEmail } from "./transactional-email-templates/send-email.ts";
import { recordAndNotifyDenial } from "./securityNotification.ts";

/** Record server-observed denials only; never store credentials or request bodies. */
export async function recordSecurityDenial(
  eventType: "admin_code_rejected" | "identity_access_denied",
  source: "admin-auth" | "admin-verifications",
  actorId: string | null = null,
): Promise<void> {
  await recordAndNotifyDenial(eventType, source, actorId, {
    record: async (type, eventSource, actor) => {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("Unavailable");
    const service = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await service.from("security_access_events").insert({
      event_type: type, source: eventSource, actor_id: actor, outcome: "blocked",
    }).select("id,created_at").single();
    if (error || !data) throw new Error("Recording unavailable");
    return data;
    },
    send: sendTemplateEmail,
    report: message => console.error(message),
  });
}