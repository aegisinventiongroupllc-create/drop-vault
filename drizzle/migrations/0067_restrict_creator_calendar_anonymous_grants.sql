REVOKE ALL ON public.creator_calendar_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_calendar_items TO authenticated;
GRANT ALL ON public.creator_calendar_items TO service_role;