-- ============================================================
-- BLOCO 1 — BILLING / CRM
-- ============================================================

CREATE TABLE public.user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plano TEXT NOT NULL DEFAULT 'free' CHECK (plano IN ('free','premium_mensal','premium_anual','empresa')),
  valor_cobrado NUMERIC(10,2) DEFAULT 0,
  data_inicio TIMESTAMPTZ DEFAULT NOW(),
  data_fim TIMESTAMPTZ,
  cancelado_em TIMESTAMPTZ,
  motivo_cancelamento TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_plans TO authenticated;
GRANT ALL ON public.user_plans TO service_role;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin gerencia user_plans" ON public.user_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE TABLE public.crm_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('cadastro','primeiro_ponto','upgrade','downgrade','cancelamento','reativacao','suporte','nota_admin')),
  descricao TEXT,
  admin_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_eventos TO authenticated;
GRANT ALL ON public.crm_eventos TO service_role;
ALTER TABLE public.crm_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin gerencia crm_eventos" ON public.crm_eventos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- ============================================================
-- BLOCO 2 — EMPRESAS
-- ============================================================

CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  email_contato TEXT,
  telefone TEXT,
  plano TEXT NOT NULL DEFAULT 'start' CHECK (plano IN ('start','flow','nexus')),
  max_colaboradores INTEGER NOT NULL DEFAULT 15,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  admin_user_id UUID REFERENCES auth.users(id),
  logo_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin gerencia empresas" ON public.empresas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE TABLE public.setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.setores TO authenticated;
GRANT ALL ON public.setores TO service_role;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin gerencia setores" ON public.setores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE TABLE public.colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
  nome_completo TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  matricula TEXT,
  cargo TEXT,
  data_admissao DATE,
  data_demissao DATE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaboradores TO authenticated;
GRANT ALL ON public.colaboradores TO service_role;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin gerencia colaboradores" ON public.colaboradores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE TABLE public.jornadas_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('fixo','flexivel','escala','homeoffice')),
  segunda_entrada TIME, segunda_saida TIME, segunda_intervalo INTEGER DEFAULT 60,
  terca_entrada TIME, terca_saida TIME, terca_intervalo INTEGER DEFAULT 60,
  quarta_entrada TIME, quarta_saida TIME, quarta_intervalo INTEGER DEFAULT 60,
  quinta_entrada TIME, quinta_saida TIME, quinta_intervalo INTEGER DEFAULT 60,
  sexta_entrada TIME, sexta_saida TIME, sexta_intervalo INTEGER DEFAULT 60,
  sabado_entrada TIME, sabado_saida TIME, sabado_intervalo INTEGER DEFAULT 30,
  domingo_entrada TIME, domingo_saida TIME, domingo_intervalo INTEGER DEFAULT 0,
  carga_semanal_horas NUMERIC(5,2) DEFAULT 44,
  folgas_flexiveis_semana INTEGER DEFAULT 1,
  escala_descricao TEXT,
  escala_horas_trabalho INTEGER,
  escala_horas_folga INTEGER,
  tolerancia_minutos INTEGER NOT NULL DEFAULT 5,
  he_percentual_dia_util INTEGER NOT NULL DEFAULT 50,
  he_percentual_feriado INTEGER NOT NULL DEFAULT 100,
  adicional_noturno BOOLEAN NOT NULL DEFAULT FALSE,
  banco_horas_ativo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jornadas_empresa TO authenticated;
GRANT ALL ON public.jornadas_empresa TO service_role;
ALTER TABLE public.jornadas_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin gerencia jornadas_empresa" ON public.jornadas_empresa
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE TABLE public.colaborador_jornadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  jornada_id UUID NOT NULL REFERENCES public.jornadas_empresa(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaborador_jornadas TO authenticated;
GRANT ALL ON public.colaborador_jornadas TO service_role;
ALTER TABLE public.colaborador_jornadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin gerencia colaborador_jornadas" ON public.colaborador_jornadas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- ============================================================
-- Triggers de updated_at
-- ============================================================
CREATE TRIGGER update_user_plans_updated_at BEFORE UPDATE ON public.user_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_colaboradores_updated_at BEFORE UPDATE ON public.colaboradores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Índices auxiliares
-- ============================================================
CREATE INDEX idx_crm_eventos_user ON public.crm_eventos(user_id);
CREATE INDEX idx_setores_empresa ON public.setores(empresa_id);
CREATE INDEX idx_colaboradores_empresa ON public.colaboradores(empresa_id);
CREATE INDEX idx_colaboradores_setor ON public.colaboradores(setor_id);
CREATE INDEX idx_jornadas_empresa_empresa ON public.jornadas_empresa(empresa_id);
CREATE INDEX idx_colab_jornadas_colab ON public.colaborador_jornadas(colaborador_id);