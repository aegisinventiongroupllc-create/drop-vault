REVOKE INSERT, UPDATE ON public.account_preferences FROM authenticated;
GRANT UPDATE (customer_preference) ON public.account_preferences TO authenticated;

DROP POLICY IF EXISTS "Users can insert own account preference" ON public.account_preferences;

CREATE OR REPLACE FUNCTION public.set_my_account_type(_account_type text)
RETURNS public.account_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text := lower(auth.jwt()->>'email');
  _result public.account_preferences;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _account_type NOT IN ('creator', 'customer') THEN
    RAISE EXCEPTION 'Invalid account type';
  END IF;
  IF _email IS NULL OR _email = '' THEN
    RAISE EXCEPTION 'Account email is unavailable';
  END IF;

  INSERT INTO public.account_preferences (user_id, email, account_type)
  VALUES (_uid, _email, _account_type)
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      account_type = EXCLUDED.account_type,
      updated_at = now()
  RETURNING * INTO _result;

  UPDATE public.profiles
  SET email = _email,
      role = _account_type,
      role_chosen = true,
      updated_at = now()
  WHERE user_id = _uid;

  DELETE FROM public.user_roles
  WHERE user_id = _uid AND role IN ('creator'::public.app_role, 'customer'::public.app_role);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, _account_type::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_account_type(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_account_type(text) TO authenticated, service_role;