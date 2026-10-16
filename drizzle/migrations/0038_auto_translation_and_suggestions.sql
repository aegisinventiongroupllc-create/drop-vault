CREATE TABLE public.translation_cache (
  lang text NOT NULL,
  source text NOT NULL,
  translated text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lang, source)
);
GRANT ALL ON public.translation_cache TO service_role;
ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.platform_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  role text,
  original_text text NOT NULL,
  english_text text,
  source_lang text,
  anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_suggestions TO authenticated;
GRANT ALL ON public.platform_suggestions TO service_role;
ALTER TABLE public.platform_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read suggestions" ON public.platform_suggestions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));