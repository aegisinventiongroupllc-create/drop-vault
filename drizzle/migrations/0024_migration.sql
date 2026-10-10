CREATE TABLE public.account_bans (
  user_id uuid PRIMARY KEY,
  reason text NOT NULL,
  payment_id text,
  tokens_revoked integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_bans ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.account_bans TO authenticated;
CREATE POLICY "Users see own ban" ON public.account_bans FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins see bans" ON public.account_bans FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_chargeback(_payment_id text, _reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid; _bal int;
BEGIN
  SELECT user_id INTO _uid FROM public.token_purchases WHERE payment_id = _payment_id;
  IF _uid IS NULL THEN RETURN false; END IF;
  UPDATE public.token_purchases SET status = 'chargeback' WHERE payment_id = _payment_id;
  SELECT balance INTO _bal FROM public.token_balances WHERE user_id = _uid FOR UPDATE;
  UPDATE public.token_balances SET balance = 0, updated_at = now() WHERE user_id = _uid;
  UPDATE public.token_purchases SET tokens_remaining = 0 WHERE user_id = _uid;
  INSERT INTO public.account_bans (user_id, reason, payment_id, tokens_revoked)
  VALUES (_uid, _reason, _payment_id, coalesce(_bal,0))
  ON CONFLICT (user_id) DO UPDATE SET tokens_revoked = public.account_bans.tokens_revoked + EXCLUDED.tokens_revoked;
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_chargeback(text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_lift_ban(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
  DELETE FROM public.account_bans WHERE user_id = _user_id;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.block_banned_unlock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.account_bans WHERE user_id = NEW.customer_id) THEN
    RAISE EXCEPTION 'ACCOUNT_LOCKED';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER block_banned_unlock_trg BEFORE INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.block_banned_unlock();