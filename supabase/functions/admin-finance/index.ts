import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-passcode",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_PASSCODE = Deno.env.get("ADMIN_PASSCODE") ?? "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const passcode = req.headers.get("x-admin-passcode") ?? "";
    if (passcode !== ADMIN_PASSCODE) return json({ error: "Invalid admin passcode" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    const loadProfiles = async (ids: string[]) => {
      const map: Record<string, { email: string | null; display_name: string | null }> = {};
      if (!ids.length) return map;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .in("user_id", ids);
      for (const p of data || []) map[p.user_id] = { email: p.email, display_name: p.display_name };
      return map;
    };

    if (action === "overview") {
      const [{ data: txs }, { data: wallets }, { data: batches }] = await Promise.all([
        supabase.from("transactions").select("amount_usd, creator_share_usd, platform_share_usd, entry_tax, status"),
        supabase.from("creator_wallets").select("user_id, ltc_address, pending_balance, total_earned, total_paid"),
        supabase.from("payout_batches").select("*").order("created_at", { ascending: false }).limit(10),
      ]);

      const done = (txs || []).filter((t: any) => t.status === "completed");
      const sum = (k: string) => done.reduce((s: number, t: any) => s + (Number(t[k]) || 0), 0);

      const profMap = await loadProfiles((wallets || []).map((w: any) => w.user_id));

      return json({
        totals: {
          gross_volume: sum("amount_usd"),
          creator_share: sum("creator_share_usd"),
          platform_share: sum("platform_share_usd"),
          entry_tax: sum("entry_tax"),
          transactions: done.length,
        },
        wallets: (wallets || []).map((w: any) => ({
          ...w,
          pending_balance: Number(w.pending_balance) || 0,
          total_earned: Number(w.total_earned) || 0,
          total_paid: Number(w.total_paid) || 0,
          email: profMap[w.user_id]?.email ?? null,
          display_name: profMap[w.user_id]?.display_name ?? null,
        })),
        batches: batches || [],
      });
    }

    if (action === "list_requests") {
      const { data, error } = await supabase
        .from("custom_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return json({ error: error.message }, 500);
      const ids = Array.from(
        new Set([...(data || []).map((r: any) => r.customer_id), ...(data || []).map((r: any) => r.creator_id)].filter(Boolean)),
      ) as string[];
      const profMap = await loadProfiles(ids);
      return json({
        requests: (data || []).map((r: any) => ({
          ...r,
          customer_email: profMap[r.customer_id]?.email ?? null,
          customer_name: profMap[r.customer_id]?.display_name ?? null,
          creator_email: r.creator_id ? profMap[r.creator_id]?.email ?? null : null,
        })),
      });
    }

    if (action === "pay_all") {
      const { data: wallets, error } = await supabase
        .from("creator_wallets")
        .select("user_id, ltc_address, pending_balance, total_paid")
        .gt("pending_balance", 0);
      if (error) return json({ error: error.message }, 500);

      const payable = (wallets || []).filter((w: any) => (w.ltc_address || "").trim().length > 0);
      const skipped = (wallets || []).filter((w: any) => !(w.ltc_address || "").trim());
      if (!payable.length) {
        return json({ ok: false, message: "No creators with a pending balance and a saved LTC address.", skipped: skipped.length });
      }

      const profMap = await loadProfiles(payable.map((w: any) => w.user_id));
      const total = payable.reduce((s: number, w: any) => s + Number(w.pending_balance), 0);
      const details = payable.map((w: any) => ({
        user_id: w.user_id,
        email: profMap[w.user_id]?.email ?? null,
        display_name: profMap[w.user_id]?.display_name ?? null,
        ltc_address: w.ltc_address,
        amount_usd: Number(w.pending_balance),
      }));

      const { data: batch, error: bErr } = await supabase
        .from("payout_batches")
        .insert({
          total_amount: total,
          total_creators: details.length,
          status: "recorded",
          payout_details: details,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (bErr) return json({ error: bErr.message }, 500);

      for (const w of payable) {
        await supabase
          .from("creator_wallets")
          .update({
            pending_balance: 0,
            total_paid: (Number(w.total_paid) || 0) + Number(w.pending_balance),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", w.user_id);
      }

      return json({ ok: true, batch, details, total, skipped: skipped.length });
    }

    if (action === "delete_consent") {
      const id = body?.id as string;
      if (!id) return json({ error: "Missing id" }, 400);
      const { error } = await supabase.from("legal_consents").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
