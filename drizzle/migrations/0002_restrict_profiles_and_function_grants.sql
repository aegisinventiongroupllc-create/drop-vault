-- 1. Stop exposing every profile (email, legal name, DOB, verification notes) to all users
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Safe public projection of non-sensitive profile fields for browsing creators
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT
  user_id,
  display_name,
  country,
  vault_side,
  role,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 3. Lock down SECURITY DEFINER functions that must never be called directly by clients
REVOKE ALL ON FUNCTION public.credit_tokens(uuid, text, integer, numeric) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_verification() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.unlock_creator(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- unlock_creator stays callable by signed-in users (it validates auth.uid() internally);
-- has_role stays callable by authenticated because RLS policies evaluate it as the caller.
GRANT EXECUTE ON FUNCTION public.unlock_creator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;