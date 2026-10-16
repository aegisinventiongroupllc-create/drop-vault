CREATE INDEX IF NOT EXISTS transactions_creator_completed_history_idx ON public.transactions (creator_id, created_at DESC, id DESC) WHERE status = 'completed';
CREATE OR REPLACE FUNCTION public.get_my_monthly_revenue()
RETURNS TABLE(month text, transaction_count bigint, base_usd numeric, creator_usd numeric, platform_usd numeric, entry_fee_usd numeric, commission_usd numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT to_char(t.created_at AT TIME ZONE 'UTC', 'YYYY-MM'), count(*),
    coalesce(sum(t.amount_usd), 0), coalesce(sum(t.creator_share_usd), 0),
    coalesce(sum(t.platform_share_usd), 0), coalesce(sum(t.entry_tax), 0),
    coalesce(sum(t.platform_commission), 0)
  FROM public.transactions t
  WHERE t.creator_id = (SELECT auth.uid()) AND t.status = 'completed'
  GROUP BY to_char(t.created_at AT TIME ZONE 'UTC', 'YYYY-MM')
  ORDER BY 1 DESC;
$$;
REVOKE ALL ON FUNCTION public.get_my_monthly_revenue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_monthly_revenue() TO authenticated;
COMMENT ON FUNCTION public.get_my_monthly_revenue() IS 'Read-only UTC monthly history for the signed-in creator using original completed ledger amounts; never recalculates historical splits.';