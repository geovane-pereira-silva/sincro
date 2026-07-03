REVOKE EXECUTE ON FUNCTION public.verificar_recompensas_premium() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verificar_recompensas_premium() FROM anon;
GRANT EXECUTE ON FUNCTION public.verificar_recompensas_premium() TO authenticated;