CREATE OR REPLACE FUNCTION public.verificar_recompensas_premium()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_tz text;
  v_recompensas jsonb := '[]'::jsonb;
  v_streak int := 0;
  v_cursor date;
  v_indicados int;
  v_ja_ref int;
  v_falta int;
  v_qualif int;
  v_ja_ic int;
  v_falta_ic int;
  i int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN v_recompensas;
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN
    RETURN v_recompensas;
  END IF;

  v_tz := COALESCE(NULLIF(trim(v_profile.timezone), ''), 'America/Sao_Paulo');

  -- A) streak_7: dias consecutivos com registro terminando hoje (no fuso do usuário)
  v_cursor := (now() AT TIME ZONE v_tz)::date;
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.ponto_registros
      WHERE user_id = v_uid
        AND (data_hora AT TIME ZONE v_tz)::date = v_cursor
    ) THEN
      v_streak := v_streak + 1;
      v_cursor := v_cursor - 1;
    ELSE
      EXIT;
    END IF;
    EXIT WHEN v_streak >= 400;
  END LOOP;

  IF v_streak >= 7 AND NOT EXISTS (
    SELECT 1 FROM public.premium_access
    WHERE user_id = v_uid AND motivo = 'streak_7' AND valido_ate > now()
  ) THEN
    INSERT INTO public.premium_access(user_id, motivo, valido_ate)
    VALUES (v_uid, 'streak_7', now() + interval '7 days');
    v_recompensas := v_recompensas || jsonb_build_array(
      jsonb_build_object('motivo', 'streak_7', 'dias', 7, 'quantidade', 1)
    );
  END IF;

  -- B) perfil_completo
  IF COALESCE(trim(v_profile.nome_completo), '') <> ''
     AND COALESCE(trim(v_profile.profissao), '') <> ''
     AND v_profile.carga_horaria_diaria IS NOT NULL
     AND COALESCE(trim(v_profile.timezone), '') <> ''
     AND COALESCE(trim(v_profile.avatar_url), '') <> ''
     AND NOT EXISTS (
       SELECT 1 FROM public.premium_access
       WHERE user_id = v_uid AND motivo = 'perfil_completo' AND valido_ate > now()
     )
  THEN
    INSERT INTO public.premium_access(user_id, motivo, valido_ate)
    VALUES (v_uid, 'perfil_completo', now() + interval '3 days');
    v_recompensas := v_recompensas || jsonb_build_array(
      jsonb_build_object('motivo', 'perfil_completo', 'dias', 3, 'quantidade', 1)
    );
  END IF;

  -- C) referral: uma recompensa de 30 dias por cada indicacao ainda nao recompensada
  v_indicados := COALESCE(v_profile.referral_count, 0);
  SELECT count(*) INTO v_ja_ref
  FROM public.premium_access
  WHERE user_id = v_uid AND motivo = 'referral';
  v_falta := v_indicados - v_ja_ref;
  IF v_falta > 0 THEN
    FOR i IN 1..v_falta LOOP
      INSERT INTO public.premium_access(user_id, motivo, valido_ate)
      VALUES (v_uid, 'referral', now() + interval '30 days');
    END LOOP;
    v_recompensas := v_recompensas || jsonb_build_array(
      jsonb_build_object('motivo', 'referral', 'dias', 30, 'quantidade', v_falta)
    );
  END IF;

  -- D) indicado_compartilhou: cada indicado do usuario que tambem virou indicador rende +15 dias
  SELECT count(*) INTO v_qualif
  FROM public.profiles px
  WHERE px.referred_by = v_uid
    AND EXISTS (
      SELECT 1 FROM public.premium_access pa
      WHERE pa.user_id = px.id AND pa.motivo = 'referral'
    );
  SELECT count(*) INTO v_ja_ic
  FROM public.premium_access
  WHERE user_id = v_uid AND motivo = 'indicado_compartilhou';
  v_falta_ic := v_qualif - v_ja_ic;
  IF v_falta_ic > 0 THEN
    FOR i IN 1..v_falta_ic LOOP
      INSERT INTO public.premium_access(user_id, motivo, valido_ate)
      VALUES (v_uid, 'indicado_compartilhou', now() + interval '15 days');
    END LOOP;
    v_recompensas := v_recompensas || jsonb_build_array(
      jsonb_build_object('motivo', 'indicado_compartilhou', 'dias', 15, 'quantidade', v_falta_ic)
    );
  END IF;

  RETURN v_recompensas;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verificar_recompensas_premium() TO authenticated;