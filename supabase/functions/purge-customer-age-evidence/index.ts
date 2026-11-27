import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { purgeCustomerAge } from "../_shared/purgeCustomerAge.ts";
Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = authenticateCronRequest(request);
  if (denied) return new Response(denied.body, { status: denied.status, headers: corsHeaders });
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), secret = Deno.env.get("DTT_CUSTOMER_AUDIT_KEY");
    if (!url || !serviceKey || !secret) return json({ error: "Cleanup unavailable" }, 503);
    const service = createClient(url, serviceKey);
    const { data, error } = await service.from("dtt_identity_reviews").select("id").eq("audience", "customer").in("status", ["approved", "rejected"]).order("reviewed_at").limit(100);
    if (error) return json({ error: "Cleanup unavailable" }, 500);
    let completed = 0, failed = 0;
    for (const row of data ?? []) { try { await purgeCustomerAge(service, row.id, secret); completed++; } catch { failed++; } }
    return json({ completed, failed }, failed ? 503 : 200);
  } catch { return json({ error: "Cleanup unavailable" }, 500); }
});