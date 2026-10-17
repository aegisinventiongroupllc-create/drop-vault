import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Service unavailable" }, 503);
    const admin = createClient(url, key);
    const token = req.headers.get("Authorization")?.replace(/^Bearer /, "");
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data, error } = await admin.auth.getClaims(token);
    const uid = data?.claims?.sub;
    if (error || typeof uid !== "string") return json({ error: "Unauthorized" }, 401);
    const body = await req.json();
    if (typeof body.request_id !== "string") return json({ error: "Request required" }, 400);
    const { data: request } = await admin.from("custom_requests").select("creator_id,customer_id,status,delivery_path,delivery_access_until").eq("id", body.request_id).maybeSingle();
    if (!request || (request.customer_id !== uid && request.creator_id !== uid)) return json({ error: "Not your request" }, 403);
    const { data: ban } = await admin.from("account_bans").select("user_id").eq("user_id", uid).maybeSingle();
    if (ban) return json({ error: "Account is restricted" }, 403);
    const path = request.delivery_path;
    if (!path || !path.startsWith(`${request.creator_id}/${body.request_id}/`) || path.includes("..")) return json({ error: "Video unavailable" }, 404);
    let seconds = 60;
    if (uid !== request.creator_id) {
      const remaining = Math.floor((new Date(request.delivery_access_until || "").getTime() - Date.now()) / 1000);
      if (request.status !== "completed" || !Number.isFinite(remaining) || remaining <= 0) return json({ error: "14-day access expired or payment not confirmed" }, 403);
      seconds = Math.min(seconds, remaining);
    }
    const signed = await admin.storage.from("request-deliveries").createSignedUrl(path, seconds);
    if (signed.error) return json({ error: "Video unavailable" }, 404);
    return json({ url: signed.data.signedUrl });
  } catch { return json({ error: "Unable to open request video" }, 500); }
});