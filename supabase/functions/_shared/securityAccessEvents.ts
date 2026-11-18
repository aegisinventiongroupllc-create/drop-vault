import { createClient } from "npm:@supabase/supabase-js@2";

/** Record server-observed denials only; never store credentials or request bodies. */
export async function recordSecurityDenial(
  eventType: "admin_code_rejected" | "identity_access_denied",
  source: "admin-auth" | "admin-verifications",
  actorId: string | null = null,
): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("Unavailable");
    const service = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await service.from("security_access_events").insert({
      event_type: eventType, source, actor_id: actorId, outcome: "blocked",
    });
    if (error) throw error;
  } catch {
    // Monitoring failure must never turn a denied request into allowed access.
    console.error("Security denial recording unavailable");
  }
}