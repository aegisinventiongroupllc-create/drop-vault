import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendCreatorSignupNotice } from "../_shared/creatorSignupEmail.ts";
import { z } from 'npm:zod@3.25.76';
import { SIGNUP_STEPS } from '../_shared/signupProgress.ts';
const bodySchema = z.object({ event: z.enum(['confirmed', 'setup_saved', 'waitlist_joined', 'issue']).optional(), step: z.enum(SIGNUP_STEPS).optional() }).strict().refine(body => body.event !== 'issue' || Boolean(body.step));
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return json({ error: "Service unavailable" }, 503);
  const token = req.headers.get("Authorization")?.replace(/^Bearer /i, "");
  if (!token) return json({ error: "Sign in required" }, 401);
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return json({ error: "Sign in required" }, 401);
  let body: unknown;
  try { body = await req.json(); } catch { return json({ error: 'Invalid request' }, 400); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return json({ error: 'Invalid signup milestone' }, 400);
  try {
    const result = await sendCreatorSignupNotice({ userId: data.user.id }, parsed.data.event, parsed.data.step);
    return json(result);
  } catch {
    console.error("Creator signup notification unavailable");
    return json({ error: "Creator notification unavailable" }, 503);
  }
});