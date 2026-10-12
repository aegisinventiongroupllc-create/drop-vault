ALTER TABLE public.power_weeks ALTER COLUMN split_creator SET DEFAULT 95;
ALTER TABLE public.power_weeks ALTER COLUMN split_platform SET DEFAULT 5;
ALTER TABLE public.power_weeks ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.power_weeks ADD COLUMN IF NOT EXISTS paid_amount_usd numeric;
ALTER TABLE public.power_weeks ADD COLUMN IF NOT EXISTS paid_note text;
CREATE INDEX IF NOT EXISTS power_weeks_creator_ends_idx ON public.power_weeks (creator_id, ends_at);

CREATE OR REPLACE FUNCTION public.creator_split_percent(_creator_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(GREATEST(
    CASE
      WHEN p.country IS NOT NULL
       AND p.created_at > now() - interval '365 days'
       AND (SELECT count(*) FROM public.profiles p2
            WHERE p2.role = 'creator' AND p2.country IS NOT NULL AND p2.country = p.country
              AND p2.created_at <= p.created_at) <= 10
      THEN 92 ELSE 90 END,
    -- Power Week pays 95/5 only while the 7-day window is open; reverts automatically after ends_at.
    CASE WHEN EXISTS (SELECT 1 FROM public.power_weeks w
              WHERE w.creator_id = _creator_id AND w.active
                AND w.started_at <= now() AND w.ends_at > now())
         THEN 95 ELSE 0 END
  ), 90)
  FROM public.profiles p WHERE p.user_id = _creator_id
$function$;