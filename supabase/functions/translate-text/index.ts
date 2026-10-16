import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { aiText } from "../_shared/aiText.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_TEXTS = 80;
const MAX_LEN = 600;

async function aiTranslate(texts: string[], lang: string): Promise<string[]> {
  let content = await aiText(
    `Translate each string in the JSON array into the language with code "${lang}". ` +
      `This is UI text for an adult creator platform called DTT. Keep brand names (DTT, Bit-Token, Vault, CCBill, LTC, USDT), numbers, prices, emails and URLs unchanged. ` +
      `Keep the same capitalization style (ALL CAPS stays ALL CAPS). Return ONLY a JSON array of the same length, same order.`,
    JSON.stringify(texts),
  );
  content = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const arr = JSON.parse(content);
  if (!Array.isArray(arr) || arr.length !== texts.length) throw new Error("bad shape");
  return arr.map((x, i) => (typeof x === "string" && x.trim() ? x : texts[i]));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const lang = String(body?.lang ?? "").toLowerCase();
    if (!/^[a-z]{2,3}(-[a-z0-9]{2,4})?$/.test(lang) || lang === "en") return json({ translations: {} });
    const texts: string[] = Array.from(
      new Set(
        (Array.isArray(body?.texts) ? body.texts : [])
          .filter((t: unknown) => typeof t === "string")
          .map((t: string) => t.trim())
          .filter((t: string) => t && t.length <= MAX_LEN),
      ),
    ).slice(0, MAX_TEXTS) as string[];
    if (!texts.length) return json({ translations: {} });

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const out: Record<string, string> = {};
    const { data: cached } = await db.from("translation_cache").select("source, translated").eq("lang", lang).in("source", texts);
    for (const r of cached || []) out[r.source] = r.translated;
    const missing = texts.filter((t) => !(t in out));
    if (missing.length) {
      const translated = await aiTranslate(missing, lang);
      const rows = missing.map((s, i) => ({ lang, source: s, translated: translated[i] }));
      rows.forEach((r) => (out[r.source] = r.translated));
      await db.from("translation_cache").upsert(rows, { onConflict: "lang,source", ignoreDuplicates: true });
    }
    return json({ translations: out });
  } catch (e) {
    return json({ translations: {}, error: String((e as Error).message) }, 200);
  }
});
