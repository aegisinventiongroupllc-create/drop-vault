CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text;
  _app_role public.app_role;
BEGIN
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  IF _role NOT IN ('creator','customer') THEN
    _role := 'customer';
  END IF;

  INSERT INTO public.profiles (user_id, email, role, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    _role,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT DO NOTHING;

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();