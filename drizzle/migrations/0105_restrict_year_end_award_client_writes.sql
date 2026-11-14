REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.year_end_award_reviews, public.year_end_award_candidates, public.creator_lifetime_awards FROM PUBLIC, anon, authenticated;
REVOKE SELECT ON public.year_end_award_reviews, public.year_end_award_candidates, public.creator_lifetime_awards FROM PUBLIC, anon;
GRANT SELECT ON public.year_end_award_reviews, public.year_end_award_candidates, public.creator_lifetime_awards TO authenticated;
GRANT ALL ON public.year_end_award_reviews, public.year_end_award_candidates, public.creator_lifetime_awards TO service_role;