-- Paid subscriptions may only be created or renewed by trusted server-side flows.
DROP POLICY IF EXISTS "Customers insert own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Customers update own subscriptions" ON public.subscriptions;

-- Creators may create their wallet record and maintain their payout address,
-- but browser requests must never choose or change earned balance fields.
DROP POLICY IF EXISTS "Creators can insert own wallet" ON public.creator_wallets;
CREATE POLICY "Creators can insert empty own wallet"
ON public.creator_wallets
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND pending_balance = 0
  AND total_earned = 0
  AND total_paid = 0
);

CREATE OR REPLACE FUNCTION public.protect_creator_wallet_balances()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated'
     AND (
       NEW.pending_balance IS DISTINCT FROM OLD.pending_balance
       OR NEW.total_earned IS DISTINCT FROM OLD.total_earned
       OR NEW.total_paid IS DISTINCT FROM OLD.total_paid
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
     ) THEN
    RAISE EXCEPTION 'Wallet balances are server-managed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_creator_wallet_balances_trigger ON public.creator_wallets;
CREATE TRIGGER protect_creator_wallet_balances_trigger
BEFORE UPDATE ON public.creator_wallets
FOR EACH ROW
EXECUTE FUNCTION public.protect_creator_wallet_balances();

REVOKE ALL ON FUNCTION public.protect_creator_wallet_balances() FROM PUBLIC, anon, authenticated;

-- A media record may reference only an object in the matching creator folder.
DROP POLICY IF EXISTS "Creators can insert own media" ON public.creator_media;
CREATE POLICY "Creators can insert own media"
ON public.creator_media
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = creator_id
  AND bucket IN ('teasers', 'vault')
  AND storage_path LIKE creator_id::text || '/%'
  AND storage_path NOT LIKE '%..%'
);

DROP POLICY IF EXISTS "Creators can update own media" ON public.creator_media;
CREATE POLICY "Creators can update own media"
ON public.creator_media
FOR UPDATE
TO authenticated
USING (auth.uid() = creator_id)
WITH CHECK (
  auth.uid() = creator_id
  AND bucket IN ('teasers', 'vault')
  AND storage_path LIKE creator_id::text || '/%'
  AND storage_path NOT LIKE '%..%'
);