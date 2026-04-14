import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabase
      .from("market_demand")
      .select("keyword, search_count, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate by keyword
    const agg: Record<string, { count: number; created_at: string }> = {};
    for (const row of data || []) {
      if (agg[row.keyword]) {
        agg[row.keyword].count += row.search_count;
      } else {
        agg[row.keyword] = { count: row.search_count, created_at: row.created_at };
      }
    }

    const result = Object.entries(agg)
      .map(([keyword, v]) => ({ keyword, count: v.count, created_at: v.created_at }))
      .sort((a, b) => b.count - a.count);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
