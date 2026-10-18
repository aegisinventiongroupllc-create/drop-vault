import { createClient } from "npm:@supabase/supabase-js@2";

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { playbackLifetime } from '../../../src/lib/mediaAccess.ts';

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
    if (typeof creatorId!=="string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(creatorId)) return json({error:"Invalid creator"},400);
    const offset=body.offset ?? 0;
    if (!Number.isSafeInteger(offset) || offset<0) return json({error:"Invalid page"},400);

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
      .order("created_at", { ascending: false }).order("id",{ascending:false}).range(offset,offset+24);
    if (mediaErr) return json({ error: mediaErr.message }, 500);

    // Storage objects are namespaced under the owning creator's UUID. Never let
    // a creator_media row reference another creator's private object.
    const ownerPrefix = `${creatorId}/`;
    const ownedMedia = (media ?? []).slice(0,24).filter((m) =>
      typeof m.storage_path === "string" &&
      m.storage_path.startsWith(ownerPrefix) &&
      !m.storage_path.includes("..")
    );
    const paths = ownedMedia.map((m) => m.storage_path);
    const urlMap: Record<string, string> = {};
    let accessUntil: string | null = null;
    if (uid!==creatorId) {
      const {data:role}=await admin.from("user_roles").select("role").eq("user_id",uid).eq("role","admin").maybeSingle();
      if(!role){const {data:sub}=await admin.from("subscriptions").select("expires_at").eq("customer_id",uid).eq("creator_id",creatorId).eq("status","active").gt("expires_at",new Date().toISOString()).maybeSingle();if(!sub)return json({error:"LOCKED"},403);accessUntil=sub.expires_at;}
    }
    const linkSeconds=playbackLifetime(accessUntil);
    if(linkSeconds<1)return json({error:"LOCKED"},403);
    if (paths.length) {
      const { data: signed,error: signingError } = await admin.storage
        .from("vault")
        .createSignedUrls(paths, linkSeconds);
      if(signingError)return json({error:'Playback temporarily unavailable'},503);
      signed?.forEach((s: any, i: number) => {
        if (s.signedUrl) urlMap[paths[i]] = s.signedUrl;
      });
    }

    const items = ownedMedia.map((m) => ({ ...m, url: urlMap[m.storage_path] ?? null }));
    return json({ items,has_more:(media?.length??0)>24,access_until:accessUntil,link_seconds:linkSeconds });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unexpected error" }, 500);
  }
});