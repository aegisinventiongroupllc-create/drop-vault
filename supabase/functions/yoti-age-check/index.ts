import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Yoti hosted Age Verification. Secrets: YOTI_SDK_ID, YOTI_API_KEY, YOTI_ENV ("sandbox" | "live").
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sdkId = Deno.env.get("YOTI_SDK_ID") ?? "";
    const apiKey = Deno.env.get("YOTI_API_KEY") ?? "";
    if (!sdkId || !apiKey) return json({ error: "Age check is not set up yet." }, 503);
    const sandbox = (Deno.env.get("YOTI_ENV") ?? "sandbox") !== "live";
    const apiBase = sandbox ? "https://age.yoti.com/sandbox/api/v1" : "https://age.yoti.com/api/v1";
    const yotiHeaders = { Authorization: `Bearer ${apiKey}`, "Yoti-SDK-Id": sdkId, "Content-Type": "application/json" };

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Please sign in again." }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "start") {
      const returnUrl = typeof body?.return_url === "string" && /^https:\/\/([a-z0-9-]+\.)*(dropthatthing\.com|lovable\.app)(\/|$)/i.test(body.return_url)
        ? body.return_url : "https://dropthatthing.com/";
      const res = await fetch(`${apiBase}/sessions`, {
        method: "POST",
        headers: yotiHeaders,
        body: JSON.stringify({
          type: "OVER",
          ttl: 900,
          reference_id: u.user.id,
          age_estimation: { allowed: true, threshold: 25, level: "PASSIVE" },
          digital_id: { allowed: true, threshold: 18, level: "NONE" },
          doc_scan: { allowed: true, threshold: 18, authenticity: "AUTO", level: "PASSIVE" },
          callback: { auto: true, url: returnUrl },
          cancel_url: returnUrl,
          synchronous_checks: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.id) {
        console.error("yoti start failed", res.status, data);
        return json({ error: "Could not start the age check." }, 502);
      }
      await admin.from("yoti_age_checks").insert({ user_id: u.user.id, session_id: data.id });
      const hosted = sandbox ? "https://age.yoti.com/sandbox" : "https://age.yoti.com";
      return json({ url: `${hosted}?sessionId=${encodeURIComponent(data.id)}&sdkId=${encodeURIComponent(sdkId)}` });
    }

    if (action === "result") {
      const { data: row } = await admin.from("yoti_age_checks").select("session_id, status")
        .eq("user_id", u.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!row) return json({ status: "none" });
      if (row.status === "passed") return json({ status: "passed" });
      const res = await fetch(`${apiBase}/sessions/${encodeURIComponent(row.session_id)}/result`, { headers: yotiHeaders });
      const data = await res.json().catch(() => ({}));
      const s = String(data?.status ?? "").toUpperCase();
      const status = s === "COMPLETE" ? "passed" : ["FAIL", "ERROR", "EXPIRED", "CANCELLED"].includes(s) ? "failed" : "pending";
      await admin.from("yoti_age_checks").update({ status, method: data?.method ?? null, updated_at: new Date().toISOString() })
        .eq("session_id", row.session_id);
      return json({ status });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Age check failed." }, 500);
  }
});
