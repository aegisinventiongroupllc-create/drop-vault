ALTER TABLE public.token_purchases REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.token_purchases';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END$$;