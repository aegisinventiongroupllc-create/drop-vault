import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-passcode",
};


const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Admin-only endpoint: it returns personal data (emails, IPs, consent history).

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Admin-only: the caller must be signed in to an account holding the admin role.
    // The access code alone never opens these records.
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = token ? await supabaseAdmin.auth.getUser(token) : { data: { user: null } };
    const { data: isAdmin } = user
      ? await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" })
      : { data: false };
    if (isAdmin !== true) return json({ error: "Unauthorized" }, 401);

    if (req.method === "GET") {
      const url = new URL(req.url);
      const rawSearch = (url.searchParams.get("search") || "").trim().slice(0, 100);
      const search = rawSearch.replace(/[%,()*]/g, "");

      let query = supabaseAdmin
        .from("legal_consents")
        .select(
          "id, user_id, username, email, ip_address, user_agent, consent_type, consent_text, terms_version, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (search) {
        query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return json(data);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("legal-logs error", err);
    return json({ error: "Unable to load legal logs" }, 500);
  }
});
