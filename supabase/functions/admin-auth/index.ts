// Verifies the admin passcode server-side so it never has to live in the website bundle.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_PASSCODE = Deno.env.get("ADMIN_PASSCODE") ?? "";

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
    return json({ ok: false, error: "Invalid access code" }, 401);
  }

  return json({ ok: true });
});
