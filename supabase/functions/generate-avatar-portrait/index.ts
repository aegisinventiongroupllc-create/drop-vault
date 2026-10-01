import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { editImage } from "../_shared/image-gateway.ts";

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
    const appearanceRaw = incoming.get("appearance");
    const appearance = typeof appearanceRaw === "string" ? appearanceRaw.slice(0, 800) : "";

    const prompt = [
      "IDENTITY-FIRST SELFIE EDIT: turn the person in the uploaded selfie into their own illustrated profile avatar. The uploaded selfie is the sole identity reference, not merely inspiration.",
      "The finished face must remain unmistakably the same individual at first glance. Faithfully retain the person's exact face silhouette, forehead and hairline, cheek width, jaw and chin geometry, eye shape/color/spacing, eyelids, nose bridge/tip/width, mouth and lip shape, eyebrows, ears, skin tone and undertone, hairstyle/color/texture, facial hair, glasses, apparent age, ethnicity, asymmetry, and other distinguishing traits visible in the selfie.",
      "Do not replace the face with a generic attractive man or woman. Do not average, idealize, slim, age, de-age, masculinize, feminize, change ethnicity, remove distinguishing features, or copy the facial identity of any example character.",
      `Presentation mode is ${style === "woman" ? "woman" : "man"}. This controls styling only; it must not alter the source person's identity, and both modes receive identical detail and finish quality.`,
      "ART DIRECTION: polished friendly semi-realistic 2D character portrait, like premium creator-profile artwork. Use crisp dark contour linework, softly painted skin, layered cel shading blended with subtle gradients, dimensional cheek and nose shadows, bright expressive detailed eyes with catchlights, carefully separated hair locks and strands, detailed facial hair where present, and believable fabric folds. Keep realistic human proportions while clearly remaining an illustration.",
      "Composition: exactly one person, centered head and upper shoulders, near-front view matching the selfie, relaxed approachable expression, full hair and chin visible, generous safe space for a circular crop. Keep the selfie's camera orientation unless a small adjustment improves the profile crop.",
      "Wardrobe: follow the user-confirmed clothing choice. Render a clean dark garment with visible collar, seams, folds, and soft fabric texture, without writing or logos.",
      "Lighting and backdrop: soft cool frontal portrait light, dimensional charcoal shadows, a restrained pink edge light, and a simple deep-charcoal studio background. The face must be brighter and clearer than the background.",
      "Avoid photorealism, flat vector art, basic emoji shapes, generic cartoon faces, caricature, anime, children's art, plastic 3D rendering, videogame screenshots, glamour retouching, or low-detail assets.",
      "Output only the finished portrait. No words, letters, logo, watermark, border, frame, UI, extra person, extra face, extra limbs, obscured face, or cropped chin.",
      appearance ? `User-confirmed mapped appearance and wardrobe to preserve: ${appearance}.` : "",
    ].filter(Boolean).join(" ");

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