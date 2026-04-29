ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_chosen boolean NOT NULL DEFAULT false;

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
    NEW.email,
    _role,
    _chosen,
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