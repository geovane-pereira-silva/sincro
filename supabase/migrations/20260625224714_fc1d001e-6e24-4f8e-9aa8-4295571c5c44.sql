CREATE OR REPLACE FUNCTION public.aplicar_indicacao(_codigo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dono uuid;
  v_ja_indicado uuid;
BEGIN
  IF _codigo IS NULL OR length(trim(_codigo)) = 0 THEN
    RETURN;
  END IF;

  -- Já foi indicado antes? não faz nada
  SELECT referred_by INTO v_ja_indicado FROM public.profiles WHERE id = auth.uid();
  IF v_ja_indicado IS NOT NULL THEN
    RETURN;
  END IF;

  -- Encontra o dono do código (case-insensitive)
  SELECT id INTO v_dono
  FROM public.profiles
  WHERE upper(referral_code) = upper(trim(_codigo))
  LIMIT 1;

  -- Código inexistente ou auto-indicação: ignora silenciosamente
  IF v_dono IS NULL OR v_dono = auth.uid() THEN
    RETURN;
  END IF;

  UPDATE public.profiles SET referred_by = v_dono WHERE id = auth.uid();
  UPDATE public.profiles SET referral_count = referral_count + 1 WHERE id = v_dono;
END;
$$;

REVOKE ALL ON FUNCTION public.aplicar_indicacao(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aplicar_indicacao(text) TO authenticated;