REVOKE EXECUTE ON FUNCTION public.creator_request_split_percent(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creator_request_split_percent(uuid) TO service_role;