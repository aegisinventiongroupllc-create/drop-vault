import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { decryptAgeDecision } from "../_shared/customerAgePrivacy.ts";
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), secret = Deno.env.get("DTT_CUSTOMER_AUDIT_KEY");
    if (!url || !anon || !serviceKey || !secret) return json({ error: "Status unavailable" }, 503);
    const client = createClient(url, anon, { global: { headers: { Authorization: request.headers.get("authorization") ?? "" } } });
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return json({ error: "Sign in required" }, 401);
    const service = createClient(url, serviceKey);
    const { data: audit, error: readError } = await service.from("customer_age_audits").select("encrypted_decision").eq("user_id", user.id).maybeSingle();
    if (readError) return json({ error: "Status unavailable" }, 500);
    const { data: collection, error: collectionError } = await client.rpc("my_customer_age_collection_status");
    if (collectionError) return json({ error: "Status unavailable" }, 500);
    const decision = audit ? await decryptAgeDecision(audit.encrypted_decision, user.id, secret) : null;
    return json({ decision, collection_ready: collection?.collection_ready === true });
  } catch { return json({ error: "Status unavailable" }, 500); }
});