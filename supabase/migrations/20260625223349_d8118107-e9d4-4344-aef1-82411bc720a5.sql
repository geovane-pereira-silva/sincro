-- 1. Novos campos em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_concluido BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS referral_count INTEGER NOT NULL DEFAULT 0;

-- 2. Gerador de código de indicação
CREATE OR REPLACE FUNCTION public.generate_referral_code(nome text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  code text;
  existe int;
BEGIN
  base := upper(regexp_replace(coalesce(nome, 'USER'), '[^a-zA-Z]', '', 'g'));
  base := rpad(left(base, 4), 4, 'X');
  LOOP
    code := base || lpad((floor(random() * 10000))::int::text, 4, '0');
    SELECT count(*) INTO existe FROM public.profiles WHERE referral_code = code;
    EXIT WHEN existe = 0;
  END LOOP;
  RETURN code;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_referral_code(text) FROM PUBLIC, anon, authenticated;

-- 3. Atualiza criação automática de perfil para incluir o código
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  INSERT INTO public.profiles (id, email, nome_completo, avatar_url, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    v_nome,
    NEW.raw_user_meta_data->>'avatar_url',
    public.generate_referral_code(v_nome)
  );
  RETURN NEW;
END;
$$;

-- 4. Preenche o código para perfis já existentes
UPDATE public.profiles
SET referral_code = public.generate_referral_code(nome_completo)
WHERE referral_code IS NULL;

-- 5. Tabela premium_access
CREATE TABLE public.premium_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  motivo TEXT NOT NULL,
  valido_ate TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.premium_access TO authenticated;
GRANT ALL ON public.premium_access TO service_role;

ALTER TABLE public.premium_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acesso proprio - leitura"
  ON public.premium_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());