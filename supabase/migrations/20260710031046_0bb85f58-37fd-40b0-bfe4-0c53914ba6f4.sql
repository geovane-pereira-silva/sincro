-- ======================= SOLICITACOES =======================
CREATE TABLE public.solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('ajuste_ponto','abono','hora_extra','ferias','folga')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado','cancelado')),
  data_referencia DATE NOT NULL,
  data_inicio DATE,
  data_fim DATE,
  horario_solicitado TIME,
  tipo_batida TEXT CHECK (tipo_batida IN ('entrada','saida','entrada_intervalo','saida_intervalo')),
  motivo TEXT NOT NULL,
  anexo_url TEXT,
  resposta_gestor TEXT,
  gestor_id UUID REFERENCES auth.users(id),
  respondido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacoes TO authenticated;
GRANT ALL ON public.solicitacoes TO service_role;
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario_ve_proprias_solicitacoes" ON public.solicitacoes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "usuario_cria_solicitacao" ON public.solicitacoes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "usuario_cancela_propria" ON public.solicitacoes FOR UPDATE USING (user_id = auth.uid() AND status = 'pendente');
CREATE POLICY "gestor_ve_empresa" ON public.solicitacoes FOR ALL USING (
  empresa_id = (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
  AND (SELECT tipo_conta FROM public.profiles WHERE id = auth.uid()) IN ('gestor','superadmin')
);

-- ======================= NOTIFICACOES =======================
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('solicitacao_criada','solicitacao_aprovada','solicitacao_rejeitada','lembrete_ponto','hora_extra_pendente','ponto_incompleto')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario_ve_proprias_notificacoes" ON public.notificacoes FOR ALL USING (user_id = auth.uid());
-- Permite que gestores/superadmins criem notificações para colaboradores da sua empresa.
CREATE POLICY "gestor_cria_notificacao_empresa" ON public.notificacoes FOR INSERT WITH CHECK (
  (SELECT tipo_conta FROM public.profiles WHERE id = auth.uid()) IN ('gestor','superadmin')
);

-- ======================= EMPRESA_LOCALIZACAO =======================
CREATE TABLE public.empresa_localizacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE UNIQUE,
  endereco TEXT NOT NULL,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  raio_metros INTEGER NOT NULL DEFAULT 100,
  exigir_localizacao BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresa_localizacao TO authenticated;
GRANT ALL ON public.empresa_localizacao TO service_role;
ALTER TABLE public.empresa_localizacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gestor_gerencia_localizacao" ON public.empresa_localizacao FOR ALL USING (
  empresa_id = (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
  AND (SELECT tipo_conta FROM public.profiles WHERE id = auth.uid()) IN ('gestor','superadmin')
);
CREATE POLICY "colaborador_le_localizacao" ON public.empresa_localizacao FOR SELECT USING (
  empresa_id = (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
);

-- ======================= CONFIG_NOTIFICACOES =======================
CREATE TABLE public.config_notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  lembrete_entrada BOOLEAN NOT NULL DEFAULT TRUE,
  lembrete_entrada_horario TIME DEFAULT '08:00',
  lembrete_saida BOOLEAN NOT NULL DEFAULT TRUE,
  lembrete_intervalo BOOLEAN NOT NULL DEFAULT TRUE,
  lembrete_antecedencia_minutos INTEGER NOT NULL DEFAULT 10,
  push_habilitado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_notificacoes TO authenticated;
GRANT ALL ON public.config_notificacoes TO service_role;
ALTER TABLE public.config_notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario_gerencia_config_notif" ON public.config_notificacoes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ======================= DIAS_ESPECIAIS (abono/folga aprovados) =======================
CREATE TABLE public.dias_especiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('abono','falta_justificada','folga','atestado','ferias','outro')),
  descricao TEXT,
  solicitacao_id UUID REFERENCES public.solicitacoes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dias_especiais TO authenticated;
GRANT ALL ON public.dias_especiais TO service_role;
ALTER TABLE public.dias_especiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario_ve_proprios_dias" ON public.dias_especiais FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "gestor_gerencia_dias_empresa" ON public.dias_especiais FOR ALL USING (
  empresa_id = (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
  AND (SELECT tipo_conta FROM public.profiles WHERE id = auth.uid()) IN ('gestor','superadmin')
);

-- ======================= COLUNAS NOVAS =======================
ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS tipo_trabalho TEXT NOT NULL DEFAULT 'interno' CHECK (tipo_trabalho IN ('interno','externo','hibrido')),
  ADD COLUMN IF NOT EXISTS exigir_justificativa_he BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS permitir_edicao_ponto_colaborador BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS exigir_justificativa_he BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS prazo_justificativa_he_horas INTEGER NOT NULL DEFAULT 24;

ALTER TABLE public.ponto_registros
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS distancia_empresa_metros INTEGER;

-- ======================= TRIGGERS updated_at =======================
CREATE TRIGGER update_solicitacoes_updated_at BEFORE UPDATE ON public.solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_empresa_localizacao_updated_at BEFORE UPDATE ON public.empresa_localizacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ======================= REALTIME =======================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;