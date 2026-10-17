-- Private records remain account-scoped; trusted admins retain compliance access.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can insert own profile" ON public.profiles TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can update own profile" ON public.profiles TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Admins can view all profiles" ON public.profiles TO authenticated USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- Explicitly scope personal-data policies to authenticated sessions.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND roles = ARRAY['public']::name[]
      AND tablename IN ('account_bans','account_preferences','activity_logs','creator_verifications','creator_wallets','creator_payouts','creator_payout_methods','pending_ltc_payments','saved_payment_methods','yoti_age_checks','platform_suggestions','legal_consents','dmca_requests')
      AND cmd IN ('SELECT','UPDATE','DELETE')
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', p.policyname, p.tablename);
  END LOOP;
END $$;

-- Remove anonymous private-data reads and privileges that bypass row filtering.
REVOKE SELECT ON public.profiles, public.account_bans, public.account_preferences, public.activity_logs, public.creator_verifications, public.creator_wallets, public.creator_payouts, public.creator_payout_methods, public.pending_ltc_payments, public.saved_payment_methods, public.yoti_age_checks, public.platform_suggestions, public.legal_consents, public.dmca_requests, public.market_demand, public.creator_profile_photos FROM anon;
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM anon, authenticated', t.tablename);
  END LOOP;
END $$;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.public_profiles FROM anon, authenticated;
GRANT SELECT ON public.public_profiles TO anon, authenticated;
COMMENT ON VIEW public.public_profiles IS 'Read-only public social projection. Explicit columns exclude email, phone, legal names, date of birth, verification notes, payment details, and private document paths. Selected creator photo only; no inactive gallery paths.';

-- Only the display setting is public; future internal settings are admin-only.
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
CREATE POLICY "Public reads allowlisted display settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (key = 'globe_style');
CREATE POLICY "Admins read all app settings" ON public.app_settings FOR SELECT TO authenticated USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- Keep this bucket private. Members see only explicitly selected creator photos.
DROP POLICY IF EXISTS "View own or active creator profile photo files" ON storage.objects;
CREATE POLICY "View own or active creator profile photo files" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'creator-profile-photos'
  AND (
    (owner_id = (SELECT auth.uid()::text) AND (storage.foldername(name))[1] = (SELECT auth.uid()::text))
    OR EXISTS (
      SELECT 1 FROM public.creator_profile_photos cpp
      WHERE cpp.storage_path = objects.name AND cpp.is_active
        AND cpp.creator_id::text = (storage.foldername(objects.name))[1]
        AND objects.owner_id = cpp.creator_id::text
    )
  )
);
ALTER POLICY "Creators upload own public profile photos" ON storage.objects TO authenticated WITH CHECK (
  bucket_id = 'creator-profile-photos'
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  AND name NOT LIKE '%..%'
  AND public.has_role((SELECT auth.uid()), 'creator'::public.app_role)
);
ALTER POLICY "Creators update own public profile photos" ON storage.objects TO authenticated USING (
  bucket_id = 'creator-profile-photos'
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  AND public.has_role((SELECT auth.uid()), 'creator'::public.app_role)
) WITH CHECK (
  bucket_id = 'creator-profile-photos'
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  AND name NOT LIKE '%..%'
  AND public.has_role((SELECT auth.uid()), 'creator'::public.app_role)
);
ALTER POLICY "Creators delete own public profile photos" ON storage.objects TO authenticated USING (
  bucket_id = 'creator-profile-photos'
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  AND public.has_role((SELECT auth.uid()), 'creator'::public.app_role)
);
COMMENT ON TABLE public.creator_profile_photos IS 'Account-owned private gallery: owners read their gallery; members read selected active photos only. Storage writes require both folder ownership and object owner_id.';