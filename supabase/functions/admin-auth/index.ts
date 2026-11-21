// Verifies the admin passcode server-side so it never has to live in the website bundle.
// A valid passcode also signs the visitor into the administrator account, so private
// records still require a real account session and never open on a passcode alone.
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

  // Mint a one-time sign-in link for the administrator account. The client exchanges
  // the token_hash for a real session, so private identity records stay behind an
  // account session and the passcode itself never opens them.
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: roleRows, error: roleError } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .order("created_at", { ascending: true })
      .limit(1);
    if (roleError) throw roleError;
    const adminUserId = roleRows?.[0]?.user_id;
    if (!adminUserId) throw new Error("No administrator account is configured");

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(adminUserId);
    if (userError) throw userError;
    const email = userData?.user?.email;
    if (!email) throw new Error("Administrator account has no email");

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError) throw linkError;
    const tokenHash = linkData?.properties?.hashed_token;
    if (!tokenHash) throw new Error("Could not create a sign-in link");

    return json({ ok: true, token_hash: tokenHash, email });
  } catch (failure) {
    console.error("admin-auth session mint failed", failure);
    return json({ ok: false, error: 'Administrator session could not be opened. Please retry.' }, 503);
  }
});
