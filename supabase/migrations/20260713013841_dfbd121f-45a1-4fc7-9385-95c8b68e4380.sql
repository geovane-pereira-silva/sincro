-- B1: dias_especiais — tipos completos
ALTER TABLE public.dias_especiais
  DROP CONSTRAINT IF EXISTS dias_especiais_tipo_check;
ALTER TABLE public.dias_especiais
  ADD CONSTRAINT dias_especiais_tipo_check
  CHECK (tipo IN ('abono','falta_justificada','folga','atestado','ferias','feriado_manual','compensacao','outro'));

-- B4/B5: ponto_registros — origem inclui qrcode
ALTER TABLE public.ponto_registros
  DROP CONSTRAINT IF EXISTS ponto_registros_origem_check;
ALTER TABLE public.ponto_registros
  ADD CONSTRAINT ponto_registros_origem_check
  CHECK (origem IN ('web','mobile_pwa','qrcode'));

-- B5: empresa_localizacao — QR Code
ALTER TABLE public.empresa_localizacao
  ADD COLUMN IF NOT EXISTS qr_token TEXT,
  ADD COLUMN IF NOT EXISTS qr_gerado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS qr_validade_minutos INTEGER DEFAULT NULL;

-- B7: config_notificacoes — horários e toggle
ALTER TABLE public.config_notificacoes
  ADD COLUMN IF NOT EXISTS lembrete_saida_horario TIME DEFAULT '18:00:00',
  ADD COLUMN IF NOT EXISTS lembrete_intervalo_horario TIME DEFAULT '12:00:00',
  ADD COLUMN IF NOT EXISTS lembrete_solicitacoes BOOLEAN NOT NULL DEFAULT true;

-- B2: assinaturas_espelho
CREATE TABLE public.assinaturas_espelho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  periodo_mes INTEGER NOT NULL,
  periodo_ano INTEGER NOT NULL,
  modalidade TEXT NOT NULL CHECK (modalidade IN ('aceite_digital','manuscrita')),
  hash_conteudo TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  assinatura_img_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, periodo_mes, periodo_ano)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assinaturas_espelho TO authenticated;
GRANT ALL ON public.assinaturas_espelho TO service_role;
ALTER TABLE public.assinaturas_espelho ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario gerencia suas assinaturas de espelho"
  ON public.assinaturas_espelho FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Gestor le assinaturas dos colaboradores"
  ON public.assinaturas_espelho FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin')
    OR user_id IN (
      SELECT c.user_id FROM public.colaboradores c
      WHERE c.user_id IS NOT NULL
        AND c.empresa_id = public.empresa_do_usuario(auth.uid())
    )
  );

-- B7: push_subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario gerencia suas push subscriptions"
  ON public.push_subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);