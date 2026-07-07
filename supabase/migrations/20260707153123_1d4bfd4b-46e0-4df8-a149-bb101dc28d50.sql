CREATE TABLE public.assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asaas_customer_id TEXT,
  asaas_subscription_id TEXT,
  asaas_payment_id TEXT,
  plano TEXT NOT NULL CHECK (plano IN ('premium_mensal','premium_anual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','overdue','cancelled','expired')),
  valor NUMERIC(10,2) NOT NULL,
  proximo_vencimento DATE,
  cancelado_em TIMESTAMPTZ,
  motivo_cancelamento TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assinaturas TO authenticated;
GRANT ALL ON public.assinaturas TO service_role;

ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario le propria assinatura"
  ON public.assinaturas FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "superadmin gerencia assinaturas"
  ON public.assinaturas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE INDEX idx_assinaturas_user ON public.assinaturas(user_id);
CREATE INDEX idx_assinaturas_status ON public.assinaturas(status);
CREATE INDEX idx_assinaturas_asaas_sub ON public.assinaturas(asaas_subscription_id);
CREATE INDEX idx_assinaturas_asaas_pay ON public.assinaturas(asaas_payment_id);

CREATE TRIGGER update_assinaturas_updated_at
  BEFORE UPDATE ON public.assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();