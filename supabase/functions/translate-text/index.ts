import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { aiText } from "../_shared/aiText.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_TEXTS = 80;
const inProgress = new Map<string,Promise<string>>();
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
    const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!url||!key)return json({error:"Translation unavailable"},503);
    const db = createClient(url,key);
    const token=(req.headers.get("Authorization")??"").replace(/^Bearer\s+/i,"");
    const { data: auth } = token ? await db.auth.getUser(token) : { data: { user: null } };
    if(!auth?.user)return json({error:"Sign in required"},401);
    const body = await req.json().catch(() => ({}));
    const lang = String(body?.lang ?? "").toLowerCase();
    if(!Array.isArray(body?.texts)||body.texts.length>MAX_TEXTS||body.texts.some((t:unknown)=>typeof t!=="string"||t.length>MAX_LEN))return json({error:"Invalid translation texts"},400);
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

    const out: Record<string, string> = {};
    const { data: cached } = await db.from("translation_cache").select("source, translated").eq("lang", lang).in("source", texts);
    for (const r of cached || []) out[r.source] = r.translated;
    const missing = texts.filter((t) => !(t in out));
    if (missing.length) {
      const fresh=missing.filter(text=>!inProgress.has(`${lang}:${text}`));
      if(fresh.length){
        const batch=aiTranslate(fresh,lang);
        fresh.forEach((text,index)=>{
          const promise=batch.then(rows=>rows[index]);
          inProgress.set(`${lang}:${text}`,promise);
          void promise.finally(()=>inProgress.delete(`${lang}:${text}`)).catch(()=>{});
        });
      }
      const translated=await Promise.all(missing.map(text=>inProgress.get(`${lang}:${text}`)));
      const rows=missing.map((source,index)=>({lang,source,translated:translated[index]??source}));
      rows.forEach(row=>out[row.source]=row.translated);
      const {error}=await db.from("translation_cache").upsert(rows,{onConflict:"lang,source",ignoreDuplicates:true});
      if(error)console.error("Translation cache write failed",{code:error.code});

    }
    return json({ translations: out });
  } catch (e) {
    console.error("Translation request failed");
    return json({ translations: {}, error: "Translation temporarily unavailable" }, 503);
  }
});
