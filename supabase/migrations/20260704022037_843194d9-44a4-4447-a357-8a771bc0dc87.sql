CREATE TABLE public.jornada_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  dias_trabalho TEXT[] NOT NULL DEFAULT ARRAY['seg','ter','qua','qui','sex'],
  horario_entrada TIME NOT NULL DEFAULT '08:00',
  horario_saida TIME NOT NULL DEFAULT '17:00',
  intervalo_minutos INTEGER NOT NULL DEFAULT 60,
  tolerancia_minutos INTEGER NOT NULL DEFAULT 5,
  adicional_noturno BOOLEAN NOT NULL DEFAULT FALSE,
  banco_horas_ativo BOOLEAN NOT NULL DEFAULT FALSE,
  banco_horas_limite_horas NUMERIC(6,2) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jornada_config TO authenticated;
GRANT ALL ON public.jornada_config TO service_role;

ALTER TABLE public.jornada_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jornada propria"
  ON public.jornada_config
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "superadmin le todas as jornadas"
  ON public.jornada_config
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_jornada_config_updated_at
  BEFORE UPDATE ON public.jornada_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();