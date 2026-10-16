CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _meta_role text;
  _role text;
  _chosen boolean;
  _app_role public.app_role;
  _name text;
BEGIN
  _meta_role := NEW.raw_user_meta_data->>'role';
  IF _meta_role IN ('creator','customer') THEN
    _role := _meta_role;
    _chosen := true;
  ELSE
    _role := 'customer';
    _chosen := false;
  END IF;

  -- Build a handle that always satisfies the display-name format and is unique,
  -- so unusual email addresses never block signup.
  _name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), split_part(NEW.email, '@', 1));
  _name := regexp_replace(_name, '[^A-Za-z0-9_.]', '_', 'g');
  _name := regexp_replace(_name, '^[.]+', '');
  _name := left(_name, 24);
  IF _name !~ '^[A-Za-z0-9_][A-Za-z0-9_.]{2,23}$' THEN
    _name := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(display_name) = lower(_name)) THEN
    _name := left(_name, 15) || '_' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(display_name) = lower(_name)) THEN
    _name := NULL;
  END IF;

  INSERT INTO public.profiles (user_id, email, role, role_chosen, display_name)
  VALUES (NEW.id, lower(NEW.email), _role, _chosen, _name)
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
$function$;