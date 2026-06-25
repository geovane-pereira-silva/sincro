CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  profissao TEXT,
  carga_horaria_diaria NUMERIC(4,1) NOT NULL DEFAULT 8.0,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfil proprio" ON public.profiles
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE TABLE public.ponto_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'entrada_intervalo', 'saida_intervalo')),
  data_hora TIMESTAMPTZ NOT NULL,
  data_hora_original TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  foi_editado BOOLEAN NOT NULL DEFAULT FALSE,
  justificativa TEXT,
  origem TEXT NOT NULL DEFAULT 'web' CHECK (origem IN ('web', 'mobile_pwa')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_registros TO authenticated;
GRANT ALL ON public.ponto_registros TO service_role;

ALTER TABLE public.ponto_registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "registros proprios - leitura" ON public.ponto_registros
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "registros proprios - insercao" ON public.ponto_registros
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "registros proprios - edicao" ON public.ponto_registros
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_ponto_user_data ON public.ponto_registros(user_id, data_hora DESC);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome_completo, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.ponto_registros;