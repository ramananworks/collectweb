
REVOKE EXECUTE ON FUNCTION public.get_device_by_token_hash(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_device_by_token_hash(text) TO service_role;
