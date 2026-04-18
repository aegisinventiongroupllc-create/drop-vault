-- Persist creator media (teasers + vault videos) with editable titles
CREATE TABLE public.creator_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  bucket TEXT NOT NULL CHECK (bucket IN ('teasers', 'vault')),
  storage_path TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  media_type TEXT NOT NULL DEFAULT 'video' CHECK (media_type IN ('video', 'photo')),
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_media ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_creator_media_creator_id ON public.creator_media (creator_id);
CREATE INDEX idx_creator_media_bucket ON public.creator_media (bucket);

-- Creators manage their own media
CREATE POLICY "Creators can view own media"
ON public.creator_media FOR SELECT
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can insert own media"
ON public.creator_media FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own media"
ON public.creator_media FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own media"
ON public.creator_media FOR DELETE
USING (auth.uid() = creator_id);

-- Public can view teaser media metadata (titles for trailers)
CREATE POLICY "Public can view teaser media"
ON public.creator_media FOR SELECT
USING (bucket = 'teasers');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_creator_media_updated_at
BEFORE UPDATE ON public.creator_media
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin role infrastructure (separate table — never on profiles to avoid privilege escalation)
CREATE TYPE public.app_role AS ENUM ('admin', 'creator', 'customer');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can read EVERY creator's media (for the admin log)
CREATE POLICY "Admins can view all media"
ON public.creator_media FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can read all profiles, wallets, transactions, consents
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all wallets"
ON public.creator_wallets FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all transactions"
ON public.transactions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all legal consents"
ON public.legal_consents FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));