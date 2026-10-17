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

    if (action === "dashboard_stats") {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "creator");
      let totalRevenue = 0;
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase.from("transactions").select("amount_usd").eq("status", "completed").range(from, from + 999);
        for (const t of data || []) totalRevenue += Number(t.amount_usd) || 0;
        if (!data || data.length < 1000) break;
      }
      const { data: wallets } = await supabase.from("creator_wallets").select("user_id, ltc_address, pending_balance").limit(1000);
      const profiles = await loadProfiles((wallets || []).map((w) => w.user_id));
      return json({ totalCreators: count ?? 0, totalRevenue, wallets: wallets || [], profiles });
    }

    if (action === "activity") {
      const role = typeof body?.role === "string" ? body.role : "all";
      const date = typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : "";
      let q = supabase
        .from("activity_logs")
        .select("id, user_id, user_role, action_type, action_detail, metadata, activity_date, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (role === "creator" || role === "customer") q = q.eq("user_role", role);
      if (date) q = q.eq("activity_date", date);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      const rows = data || [];
      const pmap = await loadProfiles(Array.from(new Set(rows.map((r) => r.user_id))));
      return json({ rows: rows.map((r) => ({ ...r, email: pmap[r.user_id]?.email ?? null, display_name: pmap[r.user_id]?.display_name ?? null })) });
    }

    if (action === "country_stats") {
      // Paged reads so this keeps working with very large creator counts.
      const all: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase.from("profiles")
          .select("user_id, display_name, email, country, vault_side, verification_status, created_at, role")
          .eq("role", "creator").range(from, from + 999);
        all.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      const country = typeof body?.country === "string" ? body.country : null;
      if (!country) {
        const map: Record<string, { country: string; women: number; men: number }> = {};
        for (const p of all) {
          const c = p.country || "GLOBAL";
          map[c] ??= { country: c, women: 0, men: 0 };
          if (p.vault_side === "men") map[c].men++; else map[c].women++;
        }
        return json({ countries: Object.values(map).sort((a, b) => (b.women + b.men) - (a.women + a.men)) });
      }
      const list = all.filter((p) => (p.country || "GLOBAL") === country);
      const ids = list.map((p) => p.user_id);
      const stats: Record<string, { hearts: number; views: number; earned: number; unlocks: number; videos: number }> = {};
      ids.forEach((id) => (stats[id] = { hearts: 0, views: 0, earned: 0, unlocks: 0, videos: 0 }));
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        const [{ data: hearts }, { data: media }, { data: txs }] = await Promise.all([
          supabase.rpc("get_heart_counts", { _creator_ids: chunk }),
          supabase.from("creator_media").select("creator_id, views").in("creator_id", chunk),
          supabase.from("transactions").select("creator_id, creator_share_usd, status").in("creator_id", chunk).eq("status", "completed"),
        ]);
        for (const h of hearts || []) stats[h.creator_id].hearts = Number(h.hearts) || 0;
        for (const m of media || []) { stats[m.creator_id].views += Number(m.views) || 0; stats[m.creator_id].videos++; }
        for (const t of txs || []) { stats[t.creator_id].earned += Number(t.creator_share_usd) || 0; stats[t.creator_id].unlocks++; }
      }
      return json({ creators: list.map((p) => ({ ...p, ...stats[p.user_id] })) });
    }

    if (action === "suggestions") {
      const { data } = await supabase.from("platform_suggestions").select("*").order("created_at", { ascending: false }).limit(200);
      return json({ suggestions: data || [] });
    }

    if (action === "finance_details") {
      const category = body?.category;
      const page = body?.page ?? 0;
      if (!Number.isSafeInteger(page) || page < 0 || page > 100000) return json({ error: "Invalid page" }, 400);
      const transactionCategories = ["gross", "payments", "creator", "platform", "tokens"];
      if (![...transactionCategories, "purchase", "passes", "custom"].includes(category)) return json({ error: "Invalid category" }, 400);
      const isTransaction = transactionCategories.includes(category);
      const table = isTransaction ? "transactions" : category === "purchase" ? "token_purchases" : category === "passes" ? "entry_passes" : "custom_requests";
      const columns = isTransaction
        ? "id, buyer_id, creator_id, amount_usd, creator_share_usd, platform_share_usd, payment_id, status, created_at"
        : category === "purchase" ? "id, user_id, amount_usd, platform_fee_collected, payment_id, status, created_at"
        : category === "passes" ? "id, user_id, amount_usd, payment_id, status, created_at"
        : "id, customer_id, creator_id, creator_name, amount_usd, creator_share_usd, platform_share_usd, payment_id, status, created_at";
      let query = supabase.from(table).select(columns, { count: "exact" });
      // Match existing overview filters without changing its financial semantics.
      query = category === "custom" ? query.in("status", ["accepted", "completed"]) : query.eq("status", category === "passes" ? "active" : "completed");
      const { data, count, error } = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).range(page * 50, page * 50 + 49);
      if (error) return json({ error: "Couldn't load earnings records" }, 500);
      const records = (data || []) as unknown as Record<string, any>[];
      const ids = [...new Set(records.flatMap((row) => [row.buyer_id || row.customer_id || row.user_id, row.creator_id]).filter(Boolean))] as string[];
      const profiles = await loadProfiles(ids);
      const rows = records.map((row) => {
        const gross = Number(row.amount_usd) || 0;
        const creator = Number(row.creator_share_usd) || 0;
        const platform = category === "purchase" ? Number(row.platform_fee_collected) || 0 : category === "passes" ? gross : Number(row.platform_share_usd) || 0;
        const amount = category === "creator" ? creator : ["gross", "payments"].includes(category) ? gross : platform;
        return { id: row.id, created_at: row.created_at, status: row.status, payment_id: row.payment_id,
          amount, gross, creator, platform,
          customer_name: profiles[row.buyer_id || row.customer_id || row.user_id]?.display_name ?? null,
          creator_name: profiles[row.creator_id]?.display_name ?? row.creator_name ?? null };
      });
      return json({ rows, count: count ?? 0 });
    }

    if (action === "overview") {
      const [{ data: txs }, { data: wallets }, { data: batches }, { data: purchases }, { data: passes }, { data: customs }] = await Promise.all([
        supabase.from("transactions").select("amount_usd, creator_share_usd, platform_share_usd, entry_tax, status"),
        supabase.from("creator_wallets").select("user_id, ltc_address, pending_balance, total_earned, total_paid"),
        supabase.from("payout_batches").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("token_purchases").select("platform_fee_collected, status"),
        supabase.from("entry_passes").select("amount_usd, status"),
        supabase.from("custom_requests").select("platform_share_usd, status"),
      ]);

      const done = (txs || []).filter((t: any) => t.status === "completed");
      const sum = (k: string) => done.reduce((s: number, t: any) => s + (Number(t[k]) || 0), 0);

      // Platform earnings broken down by source so the owner can see each stream
      // separately from what creators are owed.
      const purchaseFees = (purchases || [])
        .filter((p: any) => p.status === "completed")
        .reduce((s: number, p: any) => s + (Number(p.platform_fee_collected) || 0), 0);
      const entryPasses = (passes || [])
        .filter((p: any) => p.status === "active")
        .reduce((s: number, p: any) => s + (Number(p.amount_usd) || 0), 0);
      const customFees = (customs || [])
        .filter((c: any) => c.status === "completed" || c.status === "accepted")
        .reduce((s: number, c: any) => s + (Number(c.platform_share_usd) || 0), 0);
      const tokenCuts = sum("platform_share_usd");

      const profMap = await loadProfiles((wallets || []).map((w: any) => w.user_id));

      return json({
        totals: {
          gross_volume: sum("amount_usd"),
          creator_share: sum("creator_share_usd"),
          platform_share: tokenCuts,
          entry_tax: sum("entry_tax"),
          transactions: done.length,
        },
        platform_earnings: {
          purchase_fees: purchaseFees,
          token_cuts: tokenCuts,
          entry_passes: entryPasses,
          custom_request_fees: customFees,
          total: purchaseFees + tokenCuts + entryPasses + customFees,
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
        const { data: pm } = await supabase.from("creator_payout_methods").select("method").eq("user_id", creatorId).maybeSingle();
        const isAch = pm?.method === "ach";
        if (!isAch && !(w.ltc_address || "").trim()) return json({ ok: false, message: "Creator has no payout method saved." });
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

      const [{ data: wallet }, { data: txs }, { data: payouts }, prof, { data: payoutMethod }] = await Promise.all([
        supabase.from("creator_wallets").select("ltc_address, pending_balance, total_earned, total_paid").eq("user_id", creatorId).maybeSingle(),
        supabase.from("transactions").select("id, amount_usd, creator_share_usd, platform_share_usd, entry_tax, platform_commission, status, created_at").eq("creator_id", creatorId).order("created_at", { ascending: false }).limit(1000),
        supabase.from("creator_payouts").select("*").eq("creator_id", creatorId).order("created_at", { ascending: false }).limit(200),
        loadProfiles([creatorId]),
        supabase.from("creator_payout_methods").select("*").eq("user_id", creatorId).maybeSingle(),
      ]);
      const done = (txs || []).filter((t: any) => t.status === "completed");
      const s = (k: string) => done.reduce((a: number, t: any) => a + (Number(t[k]) || 0), 0);
      return json({
        ok: true,
        profile: prof[creatorId] ?? null,
        wallet: wallet ?? null,
        payout_method: payoutMethod ?? null,
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

    if (action === "clear_consents") {
      const { error, count } = await supabase
        .from("legal_consents")
        .delete({ count: "exact" })
        .not("id", "is", null);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, deleted: count ?? 0 });
    }

    if (action === "top_creators") {
      const { data: txs, error } = await supabase
        .from("transactions")
        .select("creator_id, amount_usd, creator_share_usd, platform_share_usd")
        .eq("status", "completed")
        .limit(100000);
      if (error) return json({ error: error.message }, 500);
      const agg = new Map<string, { gross: number; creator_share: number; platform_share: number; sales: number }>();
      for (const t of txs || []) {
        const a = agg.get(t.creator_id) ?? { gross: 0, creator_share: 0, platform_share: 0, sales: 0 };
        a.gross += Number(t.amount_usd) || 0;
        a.creator_share += Number(t.creator_share_usd) || 0;
        a.platform_share += Number(t.platform_share_usd) || 0;
        a.sales += 1;
        agg.set(t.creator_id, a);
      }
      const ids = [...agg.keys()];
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("user_id, display_name, vault_side").in("user_id", ids)
        : { data: [] as any[] };
      const { data: wallets } = ids.length
        ? await supabase.from("creator_wallets").select("user_id, pending_balance, total_paid").in("user_id", ids)
        : { data: [] as any[] };
      const pMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      const wMap = new Map((wallets || []).map((w: any) => [w.user_id, w]));
      const rows = ids.map((id) => ({
        user_id: id,
        display_name: pMap.get(id)?.display_name ?? null,
        side: pMap.get(id)?.vault_side === "men" ? "men" : "women",
        ...agg.get(id)!,
        owed: Number(wMap.get(id)?.pending_balance) || 0,
        paid: Number(wMap.get(id)?.total_paid) || 0,
      }));
      const top = (side: string) =>
        rows.filter((r) => r.side === side).sort((a, b) => b.creator_share - a.creator_share).slice(0, 10);
      return json({ ok: true, women: top("women"), men: top("men") });
    }

    if (action === "power_weeks") {
      const { data: weeks, error } = await supabase
        .from("power_weeks").select("*").order("started_at", { ascending: false }).limit(500);
      if (error) return json({ error: error.message }, 500);
      const ids = [...new Set((weeks || []).map((w: any) => w.creator_id))];
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("user_id, display_name, vault_side").in("user_id", ids)
        : { data: [] as any[] };
      const pMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      const now = Date.now();
      const rows = await Promise.all((weeks || []).map(async (w: any) => {
        const { data: txs } = await supabase.from("transactions")
          .select("amount_usd, creator_share_usd, platform_share_usd")
          .eq("creator_id", w.creator_id).eq("status", "completed")
          .gte("created_at", w.started_at).lt("created_at", w.ends_at);
        const s = (k: string) => (txs || []).reduce((a: number, t: any) => a + (Number(t[k]) || 0), 0);
        const ended = new Date(w.ends_at).getTime() <= now;
        return {
          id: w.id, creator_id: w.creator_id,
          display_name: pMap.get(w.creator_id)?.display_name ?? null,
          side: pMap.get(w.creator_id)?.vault_side === "men" ? "men" : "women",
          started_at: w.started_at, ends_at: w.ends_at, milestone_followers: w.milestone_followers,
          status: w.paid_at ? "paid" : ended ? "ended" : "active",
          unlocks: (txs || []).length, gross: s("amount_usd"),
          creator_share: s("creator_share_usd"), platform_share: s("platform_share_usd"),
          paid_at: w.paid_at, paid_amount_usd: w.paid_amount_usd, paid_note: w.paid_note,
        };
      }));
      return json({ ok: true, weeks: rows });
    }

    if (action === "power_week_mark_paid") {
      const id = String(body?.id ?? "");
      const note = typeof body?.note === "string" ? body.note.slice(0, 300) : null;
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Invalid id" }, 400);
      const { data: w } = await supabase.from("power_weeks").select("*").eq("id", id).maybeSingle();
      if (!w) return json({ error: "Power Week not found" }, 404);
      if (w.paid_at) return json({ error: "Already filed as paid" }, 409);
      if (new Date(w.ends_at).getTime() > Date.now()) return json({ error: "This Power Week is still running" }, 409);
      const { data: txs } = await supabase.from("transactions").select("creator_share_usd")
        .eq("creator_id", w.creator_id).eq("status", "completed")
        .gte("created_at", w.started_at).lt("created_at", w.ends_at);
      const amount = (txs || []).reduce((a: number, t: any) => a + (Number(t.creator_share_usd) || 0), 0);
      const { error } = await supabase.from("power_weeks")
        .update({ paid_at: new Date().toISOString(), paid_amount_usd: amount, paid_note: note, active: false })
        .eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, amount });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
