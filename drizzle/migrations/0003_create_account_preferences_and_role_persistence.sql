CREATE TABLE public.account_preferences (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  account_type text,
  customer_preference text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT account_preferences_email_unique UNIQUE (email),
  CONSTRAINT account_preferences_type_check CHECK (account_type IS NULL OR account_type IN ('creator', 'customer')),
  CONSTRAINT account_preferences_customer_preference_check CHECK (customer_preference IS NULL OR customer_preference IN ('women', 'men', 'both'))
);

GRANT SELECT, INSERT, UPDATE ON public.account_preferences TO authenticated;
GRANT ALL ON public.account_preferences TO service_role;

ALTER TABLE public.account_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own account preference"
ON public.account_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own account preference"
ON public.account_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own account preference"
ON public.account_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX account_preferences_email_idx ON public.account_preferences (lower(email));

CREATE TRIGGER update_account_preferences_updated_at
BEFORE UPDATE ON public.account_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.account_preferences (user_id, email, account_type)
SELECT user_id, lower(email), CASE WHEN role_chosen AND role IN ('creator', 'customer') THEN role ELSE NULL END
FROM public.profiles
WHERE email IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email,
    account_type = COALESCE(public.account_preferences.account_type, EXCLUDED.account_type),
    updated_at = now();

CREATE OR REPLACE FUNCTION public.set_my_account_type(_account_type text)
RETURNS public.account_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _result public.account_preferences;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _account_type NOT IN ('creator', 'customer') THEN
    RAISE EXCEPTION 'Invalid account type';
  END IF;

  SELECT lower(email) INTO _email FROM auth.users WHERE id = _uid;
  IF _email IS NULL THEN
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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _meta_role text;
  _role text;
  _chosen boolean;
  _app_role public.app_role;
BEGIN
  _meta_role := NEW.raw_user_meta_data->>'role';
  IF _meta_role IN ('creator','customer') THEN
    _role := _meta_role;
    _chosen := true;
  ELSE
    _role := 'customer';
    _chosen := false;
  END IF;

  INSERT INTO public.profiles (user_id, email, role, role_chosen, display_name)
  VALUES (
    NEW.id,
    lower(NEW.email),
    _role,
    _chosen,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = now();

  INSERT INTO public.account_preferences (user_id, email, account_type)
  VALUES (NEW.id, lower(NEW.email), CASE WHEN _chosen THEN _role ELSE NULL END)
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      account_type = COALESCE(public.account_preferences.account_type, EXCLUDED.account_type),
      updated_at = now();

  _app_role := CASE _role
    WHEN 'creator' THEN 'creator'::public.app_role
    ELSE 'customer'::public.app_role
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;