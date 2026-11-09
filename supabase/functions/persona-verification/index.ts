import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { inquirySummary, safeOneTimeLink, PERSONA_TEMPLATE_ID } from "./personaRules.ts";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const schema = z.object({ action: z.enum(["start", "status"]) }).strict();
class ProviderError extends Error { constructor(public status: number) { super("Persona request failed"); } }
async function persona(path: string, method = "GET", body?: unknown, idempotency?: string) {
  const apiKey = Deno.env.get("UDC_PERSONA_2_API_KEY"), lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey || !lovableKey) throw new Error("Persona connection unavailable");
  const response = await fetch(`https://connector-gateway.lovable.dev/udc_persona_2/api/v1${path}`, {
    method, headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": apiKey, "Content-Type": "application/json", "Persona-Version": "2025-10-27", "Key-Inflection": "kebab", ...(idempotency ? { "Idempotency-Key": idempotency } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  // Never log raw provider responses: they can contain IDs, selfies or session credentials.
  if (!response.ok) throw new ProviderError(response.status);
  return response.json();
}
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Verification service unavailable" }, 503);
    const token = req.headers.get("Authorization")?.replace(/^Bearer /, "");
    if (!token) return json({ error: "Sign in to try Persona" }, 401);
    const db = createClient(url, key);
    const { data: claims, error: authError } = await db.auth.getClaims(token);
    const userId = claims?.claims?.sub;
    if (authError || typeof userId !== "string") return json({ error: "Sign in to try Persona" }, 401);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid verification request" }, 400);
    const { data: roles, error: roleError } = await db.from("user_roles").select("role").eq("user_id", userId).in("role", ["creator", "admin"]);
    if (roleError || !roles?.length) return json({ error: "A creator or DTT administrator account is required" }, 403);
    const { data: ban, error: banError } = await db.from("account_bans").select("user_id").eq("user_id", userId).maybeSingle();
    if (banError) return json({ error: "Account check unavailable" }, 503);
    if (ban) return json({ error: "Account locked" }, 403);
    const { data: saved, error: readError } = await db.from("persona_inquiries").select("inquiry_id,status").eq("user_id", userId).maybeSingle();
    if (readError) throw new Error("Inquiry record unavailable");
    if (!saved && parsed.data.action === "status") return json({ connected: true, environment: "sandbox", status: "not_started", grantsCreatorApproval: false });
    const resource = saved
      ? await persona(`/inquiries/${encodeURIComponent(saved.inquiry_id)}`)
      : await persona("/inquiries", "POST", { data: { attributes: { "inquiry-template-id": PERSONA_TEMPLATE_ID, "reference-id": userId } } }, `dtt-persona-sandbox-${userId}`);
    const summary = inquirySummary(resource, userId, saved?.inquiry_id);
    const { error: saveError } = await db.from("persona_inquiries").upsert({ user_id: userId, inquiry_id: summary.inquiryId, status: summary.status, environment: "sandbox", checked_at: new Date().toISOString() });
    if (saveError) throw new Error("Could not save inquiry");
    // This endpoint deliberately never writes profiles, creator_verifications or content clearance.
    let verificationUrl: string | undefined;
    if (parsed.data.action === "start" && ["created", "pending"].includes(summary.status)) {
      verificationUrl = safeOneTimeLink(await persona(`/inquiries/${summary.inquiryId}/generate-one-time-link`, "POST", {}));
    }
    return json({ connected: true, environment: "sandbox", status: summary.status, grantsCreatorApproval: false, ...(verificationUrl ? { verificationUrl } : {}) });
  } catch (error) {
    if (error instanceof ProviderError) return json({ error: `Persona could not process the test (HTTP ${error.status}). Check the sandbox template and API permissions in Persona.`, providerStatus: error.status }, error.status >= 500 ? 502 : 400);
    return json({ error: "Could not open Persona verification. Please retry or contact DTT support." }, 503);
  }
});