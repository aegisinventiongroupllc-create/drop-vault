CREATE OR REPLACE FUNCTION public.get_top_fans(_creator_id uuid)
 RETURNS TABLE(rank integer, fan_id uuid, display_name text, avatar_config jsonb, total_spent numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH viewer AS (
    SELECT auth.uid() AS uid,
           (auth.uid() = _creator_id OR public.has_role(auth.uid(), 'admin')) AS privileged
  ),
  spend AS (
    SELECT buyer_id AS fan_id, SUM(amount_usd) AS total FROM public.transactions
    WHERE creator_id = _creator_id AND status = 'completed' AND buyer_id IS NOT NULL GROUP BY buyer_id
    UNION ALL
    SELECT customer_id, SUM(amount_usd) FROM public.custom_requests
    WHERE creator_id = _creator_id AND status IN ('accepted','paid','completed') GROUP BY customer_id
  ),
  totals AS (SELECT fan_id, SUM(total) AS total_spent FROM spend GROUP BY fan_id),
  ranked AS (SELECT fan_id, total_spent, ROW_NUMBER() OVER (ORDER BY total_spent DESC, fan_id) AS rnk FROM totals)
  SELECT r.rnk::integer,
         CASE WHEN v.privileged OR r.fan_id = v.uid THEN r.fan_id ELSE NULL END,
         COALESCE(pp.display_name, 'Fan ' || r.rnk),
         pp.avatar_config,
         CASE WHEN v.privileged OR r.fan_id = v.uid THEN r.total_spent ELSE NULL END
  FROM ranked r CROSS JOIN viewer v
  LEFT JOIN public.public_profiles pp ON pp.user_id = r.fan_id
  WHERE r.rnk <= 10 AND v.uid IS NOT NULL
  ORDER BY r.rnk;
$function$;
REVOKE EXECUTE ON FUNCTION public.get_top_fans(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_top_fans(uuid) TO authenticated, service_role;