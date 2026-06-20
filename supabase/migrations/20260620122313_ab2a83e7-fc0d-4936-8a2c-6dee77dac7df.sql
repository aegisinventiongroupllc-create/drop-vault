GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_verifications TO authenticated;
GRANT ALL ON public.creator_verifications TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'sync_profile_verification_on_review'
  ) THEN
    CREATE TRIGGER sync_profile_verification_on_review
    AFTER UPDATE OF status, reviewer_notes, legal_first_name, legal_last_name, date_of_birth
    ON public.creator_verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_profile_verification();
  END IF;
END $$;