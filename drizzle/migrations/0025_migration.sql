CREATE OR REPLACE FUNCTION public.block_banned_unlock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR NEW.expires_at > OLD.expires_at)
     AND EXISTS (SELECT 1 FROM public.account_bans WHERE user_id = NEW.customer_id) THEN
    RAISE EXCEPTION 'ACCOUNT_LOCKED';
  END IF;
  RETURN NEW;
END $$;