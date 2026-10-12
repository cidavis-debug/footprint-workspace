REVOKE EXECUTE ON FUNCTION public.owns_workspace(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_workspace(uuid) TO authenticated;