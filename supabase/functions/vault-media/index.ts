import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.slice("Bearer ".length);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: claimsData, error: claimsErr } = await admin.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const uid = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const creatorId = body?.creator_id as string;
    if (!creatorId) return json({ error: "creator_id required" }, 400);

    // Authorize: self, admin, or active subscription
    let allowed = uid === creatorId;
    if (!allowed) {
      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (roles) allowed = true;
    }
    if (!allowed) {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("expires_at,status")
        .eq("customer_id", uid)
        .eq("creator_id", creatorId)
        .maybeSingle();
      if (sub && sub.status === "active" && new Date(sub.expires_at) > new Date()) {
        allowed = true;
      }
    }
    if (!allowed) return json({ error: "LOCKED" }, 403);

    const { data: media, error: mediaErr } = await admin
      .from("creator_media")
      .select("id, title, storage_path, media_type, created_at, views")
      .eq("creator_id", creatorId)
      .eq("bucket", "vault")
      .order("created_at", { ascending: false });
    if (mediaErr) return json({ error: mediaErr.message }, 500);

    const paths = (media ?? []).map((m) => m.storage_path);
    let urlMap: Record<string, string> = {};
    if (paths.length) {
      const { data: signed } = await admin.storage
        .from("vault")
        .createSignedUrls(paths, 60 * 60);
      signed?.forEach((s: any, i: number) => {
        if (s.signedUrl) urlMap[paths[i]] = s.signedUrl;
      });
    }

    const items = (media ?? []).map((m) => ({ ...m, url: urlMap[m.storage_path] ?? null }));
    return json({ items });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unexpected error" }, 500);
  }
});