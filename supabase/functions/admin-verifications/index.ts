import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-passcode",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_PASSCODE = Deno.env.get("ADMIN_PASSCODE") ?? "052417";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const passcode = req.headers.get("x-admin-passcode") ?? "";
    if (passcode !== ADMIN_PASSCODE) {
      return json({ error: "Invalid admin passcode" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action === "list") {
      const filter = (body?.filter as string) || "pending";
      let q = supabase.from("creator_verifications").select("*").order("submitted_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);

      const userIds = Array.from(new Set((data || []).map((r: any) => r.user_id)));
      let profMap: Record<string, { email: string | null; display_name: string | null }> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, email, display_name")
          .in("user_id", userIds);
        profs?.forEach((p: any) => {
          profMap[p.user_id] = { email: p.email, display_name: p.display_name };
        });
      }
      const rows = (data || []).map((r: any) => ({
        ...r,
        email: profMap[r.user_id]?.email ?? null,
        display_name: profMap[r.user_id]?.display_name ?? null,
      }));
      return json({ rows });
    }

    if (action === "signed_urls") {
      const paths = (body?.paths as string[]) || [];
      const { data, error } = await supabase.storage
        .from("id-verifications")
        .createSignedUrls(paths, 60 * 30);
      if (error) return json({ error: error.message }, 500);
      const map: Record<string, string> = {};
      data?.forEach((d: any, i: number) => {
        if (d.signedUrl) map[paths[i]] = d.signedUrl;
      });
      return json({ urls: map });
    }

    if (action === "decide") {
      const id = body?.id as string;
      const status = body?.status as "approved" | "rejected";
      const notes = (body?.notes as string) || null;
      if (!id || !["approved", "rejected"].includes(status)) {
        return json({ error: "Invalid request" }, 400);
      }
      const { error } = await supabase
        .from("creator_verifications")
        .update({
          status,
          reviewer_notes: notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    return json({ error: e?.message ?? "Unexpected error" }, 500);
  }
});