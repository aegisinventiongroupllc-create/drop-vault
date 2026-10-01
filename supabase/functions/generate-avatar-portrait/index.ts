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
      "STRICT PRIVACY-SAFE CARTOON LIKENESS EDIT: use the uploaded selfie only as a visual reference for a discreet, friendly illustrated avatar of that person. The output must be unmistakably hand-illustrated cartoon artwork at first glance, never a realistic portrait, painted photograph, photo filter, or near-photographic face.",
      "Retain only recognizable broad traits: overall face silhouette and fullness, complexion, hair color/style/texture, eyebrow character, eye color and general shape, broad nose character, smile character, facial hair, glasses, and apparent age range. Deliberately simplify and redesign fine biometric details, pores, wrinkles, skin texture, exact facial measurements, tiny asymmetries, and camera-specific detail so acquaintances may recognize the vibe while the person's exact identity remains discreet.",
      "FACE-SHAPE INCLUSION IS CRITICAL: faithfully and respectfully represent slim, oval, square, round, wide, very full, or extremely large faces. A very full face must remain recognizably full and attractive—never thin it, narrow it, stretch it, mock it, or turn it into an extreme caricature. Use balanced cartoon proportions, a slightly zoomed-out head-and-shoulders framing, and enough margin that both cheeks, ears when visible, complete hair, jaw, and chin fit comfortably inside a circular profile crop.",
      "Do not replace the person with a generic stock avatar. Do not change ethnicity, complexion, body-associated facial fullness, hair, facial hair, glasses, age range, or the broad features that make the person visually recognizable. Do not copy another person's face.",
      `Presentation mode is ${style === "woman" ? "woman" : "man"}. This controls styling only; both modes must use the same polished cartoon quality and respect the selfie-derived traits.`,
      "TARGET CARTOON STYLE: premium modern social-profile character illustration. Use confident clean dark contour lines, gently enlarged expressive eyes with illustrated catchlights, simplified smooth facial planes, flat-to-soft-gradient skin colors, two or three clearly visible levels of cel shading, controlled graphic highlights, tidy sculpted hair clumps, clean facial-hair shapes, and a warm approachable expression. Keep surfaces graphic and illustrated rather than textured or lifelike. The finish must resemble a professionally drawn animated profile character—not a real person with a filter.",
      "Composition: exactly one character, centered head and upper shoulders, near-front pose, relaxed friendly expression, complete hair and chin visible, and generous safe space for a circular crop. Choose the camera distance based on the person's natural face width so no cheek, ear, hair, jaw, or chin is clipped. Keep a clean readable silhouette suitable for a small profile icon.",
      "Wardrobe: follow the user-confirmed clothing choice. Render a clean dark garment with visible collar, seams, folds, and soft fabric texture, without writing or logos.",
      "Lighting and backdrop: soft cool frontal illustration lighting, simple charcoal cel shadows, a restrained pink edge light, and a smooth deep-charcoal circular-profile background. Keep the face bright, clean, and readable.",
      "Avoid photorealism, realistic skin texture, camera-like detail, individual pores, exact biometric reproduction, uncanny face filters, flat geometric vector art, basic emoji shapes, generic faces, weight-loss beautification, face slimming, distorted wide-angle proportions, extreme caricature, anime, children's art, plastic 3D rendering, videogame screenshots, glamour retouching, or low-detail assets.",
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