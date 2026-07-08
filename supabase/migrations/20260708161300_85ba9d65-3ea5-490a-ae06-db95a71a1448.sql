-- 1. Novo papel: gestor de empresa (login próprio que gerencia colaboradores)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestor';

-- 2. handle_new_user passa a reconhecer o tipo 'gestor'
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_nome text;
  v_username text;
  v_tipo text;
  v_empresa uuid;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  v_tipo := COALESCE(NULLIF(NEW.raw_user_meta_data->>'tipo_conta', ''), 'autonomo');
  IF v_tipo NOT IN ('autonomo', 'colaborador', 'gestor') THEN
    v_tipo := 'autonomo';
  END IF;

  BEGIN
    v_empresa := NULLIF(NEW.raw_user_meta_data->>'empresa_id', '')::uuid;
  EXCEPTION WHEN others THEN
    v_empresa := NULL;
  END;

  v_username := upper(regexp_replace(coalesce(NEW.raw_user_meta_data->>'username', ''), '[^A-Za-z0-9._]', '', 'g'));
  IF char_length(v_username) < 3 OR char_length(v_username) > 30
     OR EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
    v_username := public.generate_username(split_part(NEW.email, '@', 1));
  END IF;

  INSERT INTO public.profiles (id, email, nome_completo, avatar_url, referral_code, username, tipo_conta, empresa_id)
  VALUES (
    NEW.id,
    NEW.email,
    v_nome,
    NEW.raw_user_meta_data->>'avatar_url',
    public.generate_referral_code(v_nome),
    v_username,
    v_tipo,
    v_empresa
  );

  -- Vincula o registro de colaborador (convite) à conta recém-criada.
  IF v_tipo = 'colaborador' AND v_empresa IS NOT NULL THEN
    UPDATE public.colaboradores
    SET user_id = NEW.id,
        ativo = true,
        convite_pendente = false,
        convite_aceito_em = COALESCE(convite_aceito_em, now())
    WHERE empresa_id = v_empresa
      AND user_id IS NULL
      AND lower(email) = lower(NEW.email);
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Registro de eventos recebidos do webhook do Asaas (auditoria da integração)
CREATE TABLE public.asaas_webhook_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento text NOT NULL,
  payment_id text,
  subscription_id text,
  valor numeric,
  token_valido boolean NOT NULL DEFAULT true,
  origem text NOT NULL DEFAULT 'asaas',
  status_processamento text NOT NULL DEFAULT 'recebido',
  erro text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asaas_webhook_eventos TO authenticated;
GRANT ALL ON public.asaas_webhook_eventos TO service_role;

ALTER TABLE public.asaas_webhook_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin le eventos asaas"
  ON public.asaas_webhook_eventos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE INDEX idx_asaas_webhook_eventos_created
  ON public.asaas_webhook_eventos (created_at DESC);