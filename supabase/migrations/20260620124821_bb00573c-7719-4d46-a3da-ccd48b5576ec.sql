
CREATE OR REPLACE FUNCTION public.sync_profile_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE public.profiles
    SET verification_status = NEW.status,
        verification_reviewed_at = now(),
        verification_reviewer_notes = NEW.reviewer_notes,
        legal_first_name = NEW.legal_first_name,
        legal_last_name = NEW.legal_last_name,
        date_of_birth = NEW.date_of_birth,
        role = CASE WHEN NEW.status = 'approved' THEN 'creator' ELSE role END
    WHERE user_id = NEW.user_id;

    IF NEW.status = 'approved' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.user_id, 'creator'::public.app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSIF NEW.status = 'rejected' THEN
      DELETE FROM public.user_roles
      WHERE user_id = NEW.user_id AND role = 'creator'::public.app_role;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Backfill: grant 'creator' role to anyone already approved
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT user_id, 'creator'::public.app_role
FROM public.creator_verifications
WHERE status = 'approved'
ON CONFLICT (user_id, role) DO NOTHING;
