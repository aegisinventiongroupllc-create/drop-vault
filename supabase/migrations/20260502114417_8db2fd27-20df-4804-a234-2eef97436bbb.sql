-- 1. Add compliance fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legal_first_name TEXT,
  ADD COLUMN IF NOT EXISTS legal_last_name TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unsubmitted',
  ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_reviewer_notes TEXT;

-- 2. Verifications audit table
CREATE TABLE IF NOT EXISTS public.creator_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  legal_first_name TEXT NOT NULL,
  legal_last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  id_front_path TEXT NOT NULL,
  id_back_path TEXT NOT NULL,
  selfie_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_id UUID,
  reviewer_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cv_user ON public.creator_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_cv_status ON public.creator_verifications(status);

ALTER TABLE public.creator_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators insert own verification"
  ON public.creator_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creators view own verification"
  ON public.creator_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all verifications"
  ON public.creator_verifications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update verifications"
  ON public.creator_verifications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_cv_updated_at
  BEFORE UPDATE ON public.creator_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. When admin updates verification status, sync profile
CREATE OR REPLACE FUNCTION public.sync_profile_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE public.profiles
    SET verification_status = NEW.status,
        verification_reviewed_at = now(),
        verification_reviewer_notes = NEW.reviewer_notes,
        legal_first_name = NEW.legal_first_name,
        legal_last_name = NEW.legal_last_name,
        date_of_birth = NEW.date_of_birth
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_verification_trg ON public.creator_verifications;
CREATE TRIGGER sync_profile_verification_trg
  AFTER UPDATE ON public.creator_verifications
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_verification();

-- 4. Private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-verifications', 'id-verifications', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS — owner folder + admins
CREATE POLICY "Creators upload own ID files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'id-verifications'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Creators read own ID files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'id-verifications'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins read all ID files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'id-verifications'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );