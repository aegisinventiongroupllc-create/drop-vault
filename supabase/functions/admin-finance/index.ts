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
    if (!ADMIN_PASSCODE) return json({ error: "Admin access is not configured" }, 503);
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
      await supabase.from("creator_payouts").insert(
        payable.map((w: any) => ({
          creator_id: w.user_id, batch_id: batch.id, amount_usd: Number(w.pending_balance),
          ltc_address: w.ltc_address, status: "recorded", balance_before: Number(w.pending_balance),
          completed_at: new Date().toISOString(),
        })),
      );

      return json({ ok: true, batch, details, total, skipped: skipped.length });
    }

    if (action === "creator_detail" || action === "creator_payout") {
      const creatorId = String(body?.creator_id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(creatorId)) return json({ error: "Invalid creator_id" }, 400);

      if (action === "creator_payout") {
        const { data: w } = await supabase
          .from("creator_wallets")
          .select("ltc_address, pending_balance, total_paid")
          .eq("user_id", creatorId)
          .maybeSingle();
        const owed = Math.round((Number(w?.pending_balance) || 0) * 100) / 100;
        if (!w || owed <= 0) return json({ ok: false, message: "This creator has no balance owed." });
        if (!(w.ltc_address || "").trim()) return json({ ok: false, message: "Creator has no LTC address saved." });
        const txHash = typeof body?.tx_hash === "string" ? body.tx_hash.trim().slice(0, 200) : null;
        const now = new Date().toISOString();
        // Only the creator's own balance moves; platform fees in transactions are never touched.
        const { error: uErr } = await supabase
          .from("creator_wallets")
          .update({ pending_balance: 0, total_paid: (Number(w.total_paid) || 0) + owed, updated_at: now })
          .eq("user_id", creatorId)
          .eq("pending_balance", w.pending_balance);
        if (uErr) return json({ error: uErr.message }, 500);
        const { error: pErr } = await supabase.from("creator_payouts").insert({
          creator_id: creatorId,
          amount_usd: owed,
          ltc_address: w.ltc_address,
          status: txHash ? "sent" : "recorded",
          tx_hash: txHash || null,
          balance_before: owed,
          completed_at: now,
        });
        if (pErr) return json({ error: pErr.message }, 500);
        await supabase.from("activity_logs").insert({
          user_id: creatorId, user_role: "creator", action_type: "payout",
          action_detail: `Admin payout of $${owed.toFixed(2)}`, metadata: { ltc_address: w.ltc_address, tx_hash: txHash },
        });
      }

      const [{ data: wallet }, { data: txs }, { data: payouts }, prof] = await Promise.all([
        supabase.from("creator_wallets").select("ltc_address, pending_balance, total_earned, total_paid").eq("user_id", creatorId).maybeSingle(),
        supabase.from("transactions").select("id, amount_usd, creator_share_usd, platform_share_usd, entry_tax, platform_commission, status, created_at").eq("creator_id", creatorId).order("created_at", { ascending: false }).limit(1000),
        supabase.from("creator_payouts").select("*").eq("creator_id", creatorId).order("created_at", { ascending: false }).limit(200),
        loadProfiles([creatorId]),
      ]);
      const done = (txs || []).filter((t: any) => t.status === "completed");
      const s = (k: string) => done.reduce((a: number, t: any) => a + (Number(t[k]) || 0), 0);
      return json({
        ok: true,
        profile: prof[creatorId] ?? null,
        wallet: wallet ?? null,
        ledger: {
          unlocks: done.length,
          access_credits: done.length,
          gross: s("amount_usd"),
          creator_share: s("creator_share_usd"),
          platform_fee: s("platform_share_usd"),
          entry_tax: s("entry_tax"),
          total_paid: Number(wallet?.total_paid) || 0,
          owed: Number(wallet?.pending_balance) || 0,
        },
        transactions: (txs || []).slice(0, 25),
        payouts: payouts || [],
      });
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
