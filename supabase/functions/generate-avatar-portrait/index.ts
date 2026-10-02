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

    const sharedPrompt = [
      `Presentation mode is ${style === "woman" ? "woman" : "man"}. This controls styling only; both modes must use the same polished cartoon quality and respect the selfie-derived traits.`,
      "Composition: exactly one character, centered head and upper shoulders, near-front pose, relaxed friendly expression, complete hair and chin visible, and generous safe space for a circular crop. Choose the camera distance based on the person's natural face width so no cheek, ear, hair, jaw, or chin is clipped. Keep a clean readable silhouette suitable for a small profile icon.",
      "Wardrobe: render a clean dark hoodie or crewneck with visible collar, seams, folds, and soft fabric texture, without writing or logos.",
      "Lighting and backdrop: soft cool frontal illustration lighting, simple charcoal cel shadows, a restrained pink edge light, and a smooth deep-charcoal circular-profile background. Keep the face bright, clean, and readable.",
      "Output only the finished portrait. No words, letters, logo, watermark, border, frame, UI, extra person, extra face, extra limbs, obscured face, or cropped chin.",
    ];
    const customerPrompt = [
      "PRIVACY-SAFE CUSTOMER CARTOON AVATAR EDIT: use the selfie only as a temporary visual reference for a discreet illustrated resemblance. The result must look unmistakably like a polished hand-drawn cartoon avatar, matching the provided visual direction of a friendly social-profile character with crisp dark outlines, expressive slightly enlarged eyes, sculpted hair shapes, clean facial-hair shapes, and layered cel shading.",
      "Preserve only broad recognizable traits: overall face silhouette and fullness, complexion, hair color/style/texture, eyebrow character, general eye and nose character, smile, facial hair, glasses, and apparent age range. Intentionally redesign exact eye spacing, exact nose geometry, skin detail, pores, wrinkles, tiny asymmetries, and other biometric measurements so the customer remains discreet and cannot be mistaken for a photograph.",
      "FACE-SHAPE INCLUSION IS CRITICAL: faithfully and respectfully represent slim, oval, square, round, wide, very full, or extremely large faces. Keep a full face recognizably full and attractive. Never slim, narrow, stretch, mock, exaggerate, or crop the face.",
      "Style target: premium animated social avatar, bold clean contour linework, simplified smooth facial planes, two or three visible levels of cel shading, graphic highlights, friendly expression, and clear cartoon proportions. Avoid photorealism, exact biometric reproduction, realistic skin texture, camera detail, uncanny filters, generic stock faces, extreme caricature, anime, children's art, plastic 3D, or flat basic emoji art.",
    ];
    const creatorPrompt = [
      "CREATOR LIKENESS PORTRAIT EDIT: use the selfie as the identity anchor and create a polished, realistic illustrated portrait that allows customers to recognize the creator. Preserve the creator's actual face silhouette, complexion, eyes, nose, brows, mouth, hair, facial hair, glasses, age range, ethnicity, distinctive proportions, and natural asymmetry.",
      "Render a high-detail editorial digital illustration with dimensional lighting, refined skin shading, detailed hair strands and facial hair, natural facial proportions, and a warm authentic expression. It should remain clearly illustrated, but substantially more lifelike and identity-faithful than the customer cartoon treatment. Do not beautify into a different person, slim the face, alter ethnicity, or replace distinctive features.",
      "Avoid generic stock faces, exaggerated cartoon proportions, basic emoji art, anime, children's art, plastic 3D rendering, glamour retouching, or photographic artifacts.",
    ];
    const prompt = [...(accountType === "creator" ? creatorPrompt : customerPrompt), ...sharedPrompt].join(" ");

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