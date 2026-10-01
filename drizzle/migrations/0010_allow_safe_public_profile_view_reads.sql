ALTER VIEW public.public_profiles SET (security_invoker = false);

COMMENT ON VIEW public.public_profiles IS 'Public social identity only: user id, unique handle, avatar configuration, country, vault side, role, and creation date. Email and legal identity fields are excluded.';