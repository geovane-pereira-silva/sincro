-- 1. Novos campos em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bloqueado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- 2. Log de auditoria administrativa
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acao text NOT NULL,
  tabela text NOT NULL,
  registro_id uuid NOT NULL,
  dados_anteriores jsonb,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin le auditoria"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE INDEX idx_admin_audit_created ON public.admin_audit_log (created_at DESC);
CREATE INDEX idx_admin_audit_registro ON public.admin_audit_log (registro_id);

-- 3. Configurações administrativas
CREATE TABLE public.admin_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text UNIQUE NOT NULL,
  valor text NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_config TO authenticated;
GRANT ALL ON public.admin_config TO service_role;

ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

-- Qualquer usuario logado le (necessario para banner e modo manutencao)
CREATE POLICY "usuarios logados leem config"
  ON public.admin_config FOR SELECT
  TO authenticated
  USING (true);

-- Apenas superadmin escreve
CREATE POLICY "superadmin insere config"
  ON public.admin_config FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "superadmin atualiza config"
  ON public.admin_config FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_admin_config_updated_at
  BEFORE UPDATE ON public.admin_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seeds iniciais
INSERT INTO public.admin_config (chave, valor) VALUES
  ('mensagem_sistema', ''),
  ('modo_manutencao', 'false'),
  ('horario_manutencao', ''),
  ('premium_dias_referral', '30'),
  ('premium_dias_streak', '7'),
  ('premium_dias_perfil', '3'),
  ('premium_dias_indicado_compartilhou', '15')
ON CONFLICT (chave) DO NOTHING;