CREATE POLICY "Pass holders creators and admins read teaser files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'teasers' AND (
    public.has_active_entry_pass(auth.uid())
    OR public.has_role(auth.uid(), 'creator'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE OR REPLACE FUNCTION public.maybe_start_power_week()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count bigint; _milestone int;
BEGIN
  SELECT count(*) INTO _count FROM public.creator_hearts WHERE creator_id = NEW.creator_id;
  _milestone := (floor(_count / 100000) * 100000)::int;
  IF _milestone >= 100000 AND NOT EXISTS (
    SELECT 1 FROM public.power_weeks WHERE creator_id = NEW.creator_id AND milestone_followers >= _milestone
  ) THEN
    INSERT INTO public.power_weeks (creator_id, milestone_followers, started_at, ends_at, split_creator, split_platform, active)
    VALUES (NEW.creator_id, _milestone, now(), now() + interval '7 days', 95, 5, true);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS start_power_week_on_heart ON public.creator_hearts;
CREATE TRIGGER start_power_week_on_heart AFTER INSERT ON public.creator_hearts
FOR EACH ROW EXECUTE FUNCTION public.maybe_start_power_week();