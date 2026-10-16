-- Top-10 fans per creator, ranked by total spend (unlocks + paid custom requests).
-- Rankings are computed live from the ledger so they update automatically
-- the moment one fan outspends another.

CREATE OR REPLACE FUNCTION public.get_top_fans(_creator_id uuid)
RETURNS TABLE(rank integer, fan_id uuid, display_name text, avatar_config jsonb, total_spent numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH spend AS (
    SELECT buyer_id AS fan_id, SUM(amount_usd) AS total
    FROM public.transactions
    WHERE creator_id = _creator_id AND status = 'completed' AND buyer_id IS NOT NULL
    GROUP BY buyer_id
    UNION ALL
    SELECT customer_id AS fan_id, SUM(amount_usd) AS total
    FROM public.custom_requests
    WHERE creator_id = _creator_id AND status IN ('accepted','paid','completed')
    GROUP BY customer_id
  ),
  totals AS (
    SELECT fan_id, SUM(total) AS total_spent
    FROM spend
    GROUP BY fan_id
  ),
  ranked AS (
    SELECT fan_id, total_spent,
           ROW_NUMBER() OVER (ORDER BY total_spent DESC, fan_id) AS rnk
    FROM totals
  )
  SELECT r.rnk::integer AS rank,
         r.fan_id,
         COALESCE(pp.display_name, 'Fan ' || r.rnk) AS display_name,
         pp.avatar_config,
         r.total_spent
  FROM ranked r
  LEFT JOIN public.public_profiles pp ON pp.user_id = r.fan_id
  WHERE r.rnk <= 10
  ORDER BY r.rnk;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_fans(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_fans(uuid) TO anon;

CREATE OR REPLACE FUNCTION public.is_top_fan(_creator_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.get_top_fans(_creator_id) t
    WHERE t.fan_id = _user_id
  ) OR _user_id = _creator_id;
$$;

GRANT EXECUTE ON FUNCTION public.is_top_fan(uuid, uuid) TO authenticated;

-- Fan <-> creator direct messages. Only the creator and their current
-- top-10 fans can read or send; enforced by RLS via is_top_fan().
CREATE TABLE public.fan_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fan_messages_creator_idx ON public.fan_messages (creator_id, created_at);

GRANT SELECT, INSERT ON public.fan_messages TO authenticated;
GRANT ALL ON public.fan_messages TO service_role;

ALTER TABLE public.fan_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Top fans and creator can read messages"
ON public.fan_messages
FOR SELECT
TO authenticated
USING (public.is_top_fan(creator_id, auth.uid()));

CREATE POLICY "Top fans and creator can send messages"
ON public.fan_messages
FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.is_top_fan(creator_id, auth.uid()));
