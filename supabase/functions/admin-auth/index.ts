// Verifies the admin passcode server-side so it never has to live in the website bundle.
// The passcode is a second factor for an already signed-in administrator account;
// it never creates or opens a session by itself.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recordSecurityDenial } from "../_shared/securityAccessEvents.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_PASSCODE = Deno.env.get("ADMIN_PASSCODE") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!ADMIN_PASSCODE) return json({ error: "Admin access is not configured" }, 503);

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const passcode = typeof body?.passcode === "string" ? body.passcode.trim() : "";

  if (!passcode || passcode !== ADMIN_PASSCODE) {
    await recordSecurityDenial("admin_code_rejected", "admin-auth");
    // A wrong code is a normal sign-in outcome, not a server fault: answer 200
    // with ok:false so clients never see a failed function call.
    return json({ ok: false, error: "Invalid access code" });
  }

  // The passcode is only a second factor: the caller must already be signed in to an
  // account that holds the admin role. No session or sign-in link is ever minted here.
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userError } = jwt ? await admin.auth.getUser(jwt) : { data: null, error: null };
    const userId = userData?.user?.id;
    if (userError || !userId) {
      await recordSecurityDenial("admin_code_without_session", "admin-auth");
      return json({ ok: false, error: "Sign in to your administrator account first", needs_sign_in: true });
    }
    const { data: isAdmin, error: roleError } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (roleError) throw roleError;
    if (isAdmin !== true) {
      await recordSecurityDenial("admin_code_non_admin", "admin-auth");
      return json({ ok: false, error: "Invalid access code" });
    }
    return json({ ok: true });
  } catch (failure) {
    console.error("admin-auth check failed", failure);
    return json({ ok: false, error: 'Administrator access could not be checked. Please retry.' }, 503);
  }
});
