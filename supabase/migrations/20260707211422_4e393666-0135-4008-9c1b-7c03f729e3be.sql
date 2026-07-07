-- 1. profiles: username, tipo_conta, empresa_id
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS tipo_conta TEXT NOT NULL DEFAULT 'autonomo',
  ADD COLUMN IF NOT EXISTS empresa_id UUID DEFAULT NULL REFERENCES public.empresas(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS username_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT username_format CHECK (username IS NULL OR username ~ '^[A-Z0-9._]+$');

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS username_length;
ALTER TABLE public.profiles
  ADD CONSTRAINT username_length CHECK (username IS NULL OR char_length(username) BETWEEN 3 AND 30);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS tipo_conta_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT tipo_conta_check CHECK (tipo_conta IN ('autonomo','colaborador'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);

-- 2. colaboradores: campos de convite
ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS convite_token TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS convite_enviado_em TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS convite_aceito_em TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS convite_pendente BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_colaboradores_convite_token
  ON public.colaboradores (convite_token) WHERE convite_token IS NOT NULL;

-- 3. Função para gerar username único e válido
CREATE OR REPLACE FUNCTION public.generate_username(_base text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b text;
  candidate text;
  n int := 0;
BEGIN
  b := upper(regexp_replace(coalesce(_base, ''), '[^A-Za-z0-9._]', '', 'g'));
  b := left(b, 30);
  IF char_length(b) < 3 THEN
    b := rpad(coalesce(nullif(b, ''), 'USR'), 3, '0');
  END IF;
  candidate := b;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    n := n + 1;
    candidate := left(b, 30 - char_length(n::text)) || n::text;
  END LOOP;
  RETURN candidate;
END;
$$;

-- 4. Atualiza handle_new_user para preencher username / tipo_conta / empresa_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text;
  v_username text;
  v_tipo text;
  v_empresa uuid;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  v_tipo := COALESCE(NULLIF(NEW.raw_user_meta_data->>'tipo_conta', ''), 'autonomo');
  IF v_tipo NOT IN ('autonomo', 'colaborador') THEN
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
  RETURN NEW;
END;
$$;