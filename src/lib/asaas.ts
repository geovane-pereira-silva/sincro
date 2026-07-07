// Constantes e tipos compartilhados da integração de pagamento Asaas.
// Este arquivo é client-safe (sem segredos, sem chamadas de rede).

export type PlanoPago = "premium_mensal" | "premium_anual";
export type FormaPagamento = "PIX" | "CREDIT_CARD" | "BOLETO";
export type StatusAssinatura =
  | "pending"
  | "active"
  | "overdue"
  | "cancelled"
  | "expired";

export interface PlanoInfo {
  id: PlanoPago;
  nome: string;
  badge: string;
  valor: number;
  ciclo: "MONTHLY" | "YEARLY";
  /** Valor equivalente mensal (para exibir economia). */
  valorMensalEquivalente: number;
  economiaAnual?: number;
  destaque?: boolean;
}

/** Preços oficiais dos planos (R$). */
export const PLANOS: Record<PlanoPago, PlanoInfo> = {
  premium_mensal: {
    id: "premium_mensal",
    nome: "Premium Mensal",
    badge: "Flexível",
    valor: 14.9,
    ciclo: "MONTHLY",
    valorMensalEquivalente: 14.9,
  },
  premium_anual: {
    id: "premium_anual",
    nome: "Premium Anual",
    badge: "Mais popular",
    valor: 119.9,
    ciclo: "YEARLY",
    valorMensalEquivalente: 9.99,
    // 14,90 * 12 = 178,80 ; 178,80 - 119,90 = 58,90
    economiaAnual: 58.9,
    destaque: true,
  },
};

export const BENEFICIOS_PREMIUM: string[] = [
  "Relatório em PDF",
  "Envio por email",
  "Histórico ilimitado",
  "Gráficos de produtividade",
  "Comparativo entre meses",
  "Espelho detalhado",
  "Cálculo financeiro (valor da hora)",
];

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  PIX: "PIX",
  CREDIT_CARD: "Cartão de crédito",
  BOLETO: "Boleto",
};

export const STATUS_ASSINATURA_LABEL: Record<StatusAssinatura, string> = {
  pending: "Pendente",
  active: "Ativa",
  overdue: "Em atraso",
  cancelled: "Cancelada",
  expired: "Expirada",
};

export const STATUS_ASSINATURA_CLASSE: Record<StatusAssinatura, string> = {
  pending: "bg-muted text-muted-foreground",
  active: "bg-ponto-entrada/15 text-ponto-entrada",
  overdue: "bg-amber-500/15 text-amber-600",
  cancelled: "bg-ponto-saida/15 text-ponto-saida",
  expired: "bg-muted text-muted-foreground",
};

export function fmtMoedaBR(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

export function fmtDataBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** Remove máscara de CPF/CNPJ. */
export function limparCpfCnpj(v: string): string {
  return v.replace(/\D/g, "");
}

/** Validação simples de CPF (11) ou CNPJ (14). */
export function cpfCnpjValido(v: string): boolean {
  const n = limparCpfCnpj(v);
  return n.length === 11 || n.length === 14;
}
