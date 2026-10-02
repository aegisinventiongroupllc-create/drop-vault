import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { editImage } from "../_shared/image-gateway.ts";
import { buildAvatarPrompt, type AvatarAccountType, type AvatarPresentation } from "./avatar-style.ts";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

const json = (body: unknown, status: number) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Please sign in again." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!supabaseUrl || !anonKey || !lovableApiKey) return json({ error: "Portrait creation is not configured." }, 500);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = authHeader.slice(7);
    const { data: claims, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) return json({ error: "Please sign in again." }, 401);

    const incoming = await req.formData();
    const image = incoming.get("image");
    const style = incoming.get("style");
    if (!(image instanceof File)) return json({ error: "Choose a selfie first." }, 400);
    if (!ALLOWED_IMAGE_TYPES.has(image.type) || image.size <= 0 || image.size > MAX_IMAGE_BYTES) {
      return json({ error: "Use a JPG, PNG, WEBP, HEIC, or HEIF photo under 8 MB." }, 400);
    }
    if (style !== "woman" && style !== "man") return json({ error: "Choose a portrait style." }, 400);
    const userId = String(claims.claims.sub);
    const { data: account, error: accountError } = await authClient
      .from("account_preferences")
      .select("account_type")
      .eq("user_id", userId)
      .maybeSingle();
    if (accountError) return json({ error: "We couldn't verify your profile type. Please try again." }, 500);
    const accountType = account?.account_type;
    if (accountType !== "creator" && accountType !== "customer") {
      return json({ error: "Choose Customer or Creator before making your portrait." }, 400);
    }
    const prompt = buildAvatarPrompt(accountType as AvatarAccountType, style as AvatarPresentation);

    const upstreamForm = new FormData();
    upstreamForm.set("prompt", prompt);
    upstreamForm.set("image", image, "selfie");
    upstreamForm.set("stream", incoming.get("stream") === "false" ? "false" : "true");

    const upstream = await editImage({
      baseURL: "https://ai.gateway.lovable.dev",
      apiKey: lovableApiKey,
      model: "openai/gpt-image-2.5-sunburst",
    }, upstreamForm);

    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", upstream.headers.get("Content-Type") ?? "application/json");
    headers.set("Cache-Control", "no-store");
    upstream.headers.forEach((value, name) => {
      if (name.toLowerCase().startsWith("x-lovable-aig-")) headers.set(name, value);
    });
    headers.set("Access-Control-Expose-Headers", "X-Lovable-AIG-Run-ID");
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error("Avatar portrait generation failed", error);
    return json({ error: error instanceof Error ? error.message : "Portrait creation failed." }, 500);
  }
});