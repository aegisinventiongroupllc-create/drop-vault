import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createSign } from "node:crypto";
import { Buffer } from "node:buffer";

// Yoti Identity Verification (Doc Scan) with signed requests.
// Secrets: YOTI_SDK_ID, YOTI_PEM_KEY, YOTI_ENV ("sandbox" | "live").
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const sdkId = Deno.env.get("YOTI_SDK_ID") ?? "";
const pem = (Deno.env.get("YOTI_PEM_KEY") ?? "").replace(/\\n/g, "\n");
const sandbox = (Deno.env.get("YOTI_ENV") ?? "sandbox") !== "live";
const BASE = sandbox ? "https://api.yoti.com/sandbox/idverify/v1" : "https://api.yoti.com/idverify/v1";

async function yoti(method: "GET" | "POST", path: string, body?: unknown, raw = false) {
  const sep = path.includes("?") ? "&" : "?";
  const endpoint = `${path}${sep}sdkId=${sdkId}&nonce=${crypto.randomUUID()}&timestamp=${Date.now() * 1000}`;
  const payload = body ? JSON.stringify(body) : "";
  let msg = `${method}&${endpoint}`;
  if (payload) msg += `&${Buffer.from(payload).toString("base64")}`;
  const digest = createSign("RSA-SHA256").update(msg).sign(pem, "base64");
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: { "X-Yoti-Auth-Digest": digest, "X-Yoti-SDK": "Node", "Content-Type": "application/json", Accept: "application/json" },
    body: payload || undefined,
  });
  const data = raw ? await res.text() : await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const ageFrom = (dob: string) => {
  const d = new Date(dob); if (isNaN(+d)) return 0;
  const n = new Date(); let a = n.getFullYear() - d.getFullYear();
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!sdkId || !pem) return json({ error: "Age check is not set up yet." }, 503);
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
      const r = await yoti("POST", "/sessions", {
        client_session_token_ttl: 900,
        resources_ttl: 90000,
        user_tracking_id: u.user.id,
        requested_checks: [
          { type: "ID_DOCUMENT_AUTHENTICITY", config: {} },
          { type: "LIVENESS", config: { liveness_type: "ZOOM", max_retries: 3 } },
          { type: "ID_DOCUMENT_FACE_MATCH", config: { manual_check: "FALLBACK" } },
        ],
        requested_tasks: [{ type: "ID_DOCUMENT_TEXT_DATA_EXTRACTION", config: { manual_check: "FALLBACK" } }],
        sdk_config: { allowed_capture_methods: "CAMERA_AND_UPLOAD", success_url: returnUrl, error_url: returnUrl, primary_colour: "#FF2D95" },
      });
      const d = r.data as any;
      if (!r.ok || !d?.session_id) {
        console.error("yoti start failed", r.status, d);
        return json({ error: "Could not start the age check." }, 502);
      }
      await admin.from("yoti_age_checks").insert({ user_id: u.user.id, session_id: d.session_id });
      return json({ url: `${BASE}/web/index.html?sessionID=${encodeURIComponent(d.session_id)}&sessionToken=${encodeURIComponent(d.client_session_token)}` });
    }

    if (action === "result") {
      const { data: row } = await admin.from("yoti_age_checks").select("session_id, status")
        .eq("user_id", u.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!row) return json({ status: "none" });
      if (row.status === "passed") return json({ status: "passed" });

      const r = await yoti("GET", `/sessions/${encodeURIComponent(row.session_id)}`);
      const s = r.data as any;
      let status = "pending";
      if (s?.state === "EXPIRED") status = "failed";
      if (s?.state === "COMPLETED") {
        const checks: any[] = s.checks ?? [];
        const approved = checks.length > 0 && checks.every((c) => c?.report?.recommendation?.value === "APPROVE");
        let adult = false;
        const mediaId = s?.resources?.id_documents?.[0]?.document_fields?.media?.id;
        if (mediaId) {
          const m = await yoti("GET", `/sessions/${encodeURIComponent(row.session_id)}/media/${encodeURIComponent(mediaId)}`, undefined, true);
          try { adult = ageFrom(JSON.parse(String(m.data))?.date_of_birth ?? "") >= 18; } catch { adult = false; }
        }
        status = approved && adult ? "passed" : "failed";
      }
      await admin.from("yoti_age_checks").update({ status, method: "doc_scan", updated_at: new Date().toISOString() })
        .eq("session_id", row.session_id);
      return json({ status });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Age check failed." }, 500);
  }
});
