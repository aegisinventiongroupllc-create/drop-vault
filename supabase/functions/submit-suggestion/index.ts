import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function toEnglish(text: string): Promise<string | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: "Translate the user's message into English. If it is already English, return it unchanged. Return only the translation." },
        { role: "user", content: text },
      ],
    }),
  });
  if (!res.ok) return null;
  const d = await res.json();
  return d?.choices?.[0]?.message?.content?.trim() ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Sign in required" }, 401);

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").trim().slice(0, 2000);
    if (!text) return json({ error: "Empty" }, 400);
    const role = body?.role === "creator" ? "creator" : "customer";
    const anonymous = Boolean(body?.anonymous);
    const lang = String(body?.lang ?? "").slice(0, 10) || null;

    const english = await toEnglish(text).catch(() => null);
    const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await db.from("platform_suggestions").insert({
      user_id: anonymous ? null : u.user.id,
      role,
      original_text: text,
      english_text: english,
      source_lang: lang,
      anonymous,
    });
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error).message) }, 500);
  }
});
