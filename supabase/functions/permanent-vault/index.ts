import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Lists the signed-in customer's permanently purchased videos with short-lived links.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: claims, error } = await admin.auth.getClaims(auth.slice(7));
    if (error || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const uid = claims.claims.sub as string;
    const { data: ban } = await admin.from("account_bans").select("user_id").eq("user_id", uid).maybeSingle();
    if (ban) return json({ error: "ACCOUNT_LOCKED" }, 403);
    const body = await req.json().catch(() => ({}));
    const offset = body.offset ?? 0;
    if (!Number.isSafeInteger(offset) || offset < 0) return json({ error: "Invalid page" }, 400);

    const { data: rows, error: rowsErr } = await admin.from("user_permanent_library")
      .select("video_id, creator_id, purchased_at").eq("customer_id", uid)
      .order("purchased_at", { ascending: false }).order("video_id").range(offset, offset + 24);
    if (rowsErr) return json({ error: "Vault unavailable" }, 500);
    const page = (rows ?? []).slice(0, 24);
    if (!page.length) return json({ items: [], has_more: false });

    const { data: media } = await admin.from("creator_media")
      .select("id, creator_id, title, storage_path, media_type").in("id", page.map((r) => r.video_id)).eq("bucket", "vault");
    const { data: profiles } = await admin.from("public_profiles").select("user_id, display_name").in("user_id", page.map((r) => r.creator_id));
    const cleared=await Promise.all((media??[]).map(async m=>{const {data,error}=await admin.rpc('content_is_cleared',{_bucket:'vault',_path:m.storage_path});return !error&&data===true?m:null;}));
    const byId = new Map(cleared.filter((m):m is NonNullable<typeof m>=>m!==null).filter((m) => m.storage_path.startsWith(`${m.creator_id}/`) && !m.storage_path.includes("..")).map((m) => [m.id, m]));
    const names = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name]));
    const paths = [...byId.values()].map((m) => m.storage_path);
    const urls: Record<string, string> = {};
    if (paths.length) {
      const { data: signed, error: sErr } = await admin.storage.from("vault").createSignedUrls(paths, 3600);
      if (sErr) return json({ error: "Playback temporarily unavailable" }, 503);
      signed?.forEach((s: any, i: number) => { if (s.signedUrl) urls[paths[i]] = s.signedUrl; });
    }
    const items = page.flatMap((r) => {
      const m = byId.get(r.video_id);
      return m ? [{ id: m.id, title: m.title, media_type: m.media_type, creator_id: m.creator_id, creator_name: names.get(m.creator_id) ?? null, purchased_at: r.purchased_at, url: urls[m.storage_path] ?? null }] : [];
    });
    return json({ items, has_more: (rows?.length ?? 0) > 24, link_seconds: 3600 });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unexpected error" }, 500);
  }
});
