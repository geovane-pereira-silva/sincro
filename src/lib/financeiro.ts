// Utilidades de billing / CRM / funil do painel financeiro.
import type { Tables } from "@/integrations/supabase/types";

export type UserPlan = Tables<"user_plans">;
export type CrmEvento = Tables<"crm_eventos">;

export type PlanoUsuario =
  | "free"
  | "premium_mensal"
  | "premium_anual"
  | "empresa";

export const PLANO_USUARIO_LABEL: Record<PlanoUsuario, string> = {
  free: "Free",
  premium_mensal: "Premium Mensal",
  premium_anual: "Premium Anual",
  empresa: "Empresa",
};

export const PLANO_USUARIO_CLASSE: Record<PlanoUsuario, string> = {
  free: "bg-muted text-muted-foreground",
  premium_mensal: "bg-ponto-entrada/15 text-ponto-entrada",
  premium_anual: "bg-ponto-saida-intervalo/15 text-ponto-saida-intervalo",
  empresa: "bg-ponto-entrada-intervalo/15 text-ponto-entrada-intervalo",
};

export function planoUsuarioLabel(plano: string): string {
  return PLANO_USUARIO_LABEL[plano as PlanoUsuario] ?? plano;
}

export function fmtMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

const DIA = 24 * 3600 * 1000;

/** Um plano é considerado pago quando não é 'free'. */
export function isPago(plano: string): boolean {
  return plano !== "free" && !!plano;
}

/** Plano ativo = pago, sem cancelamento e (sem fim ou fim no futuro). */
export function planoAtivo(p: UserPlan): boolean {
  if (!isPago(p.plano)) return false;
  if (p.cancelado_em) return false;
  if (p.data_fim && new Date(p.data_fim).getTime() < Date.now()) return false;
  return true;
}

/** MRR = soma de valor_cobrado dos planos pagos ativos (anual dividido por 12). */
export function calcularMrr(planos: UserPlan[]): number {
  return planos.filter(planoAtivo).reduce((acc, p) => {
    const valor = Number(p.valor_cobrado) || 0;
    return acc + (p.plano === "premium_anual" ? valor / 12 : valor);
  }, 0);
}

/** Contagem de usuários por plano. */
export function contarPorPlano(planos: UserPlan[]): Record<string, number> {
  const out: Record<string, number> = {
    free: 0,
    premium_mensal: 0,
    premium_anual: 0,
    empresa: 0,
  };
  for (const p of planos) out[p.plano] = (out[p.plano] ?? 0) + 1;
  return out;
}

/** Cancelamentos nos últimos N dias. */
export function churnRecente(planos: UserPlan[], dias = 30): UserPlan[] {
  const limite = Date.now() - dias * DIA;
  return planos.filter(
    (p) => p.cancelado_em && new Date(p.cancelado_em).getTime() >= limite,
  );
}

/** Dias de uso antes de cancelar. */
export function diasDeUso(p: UserPlan): number {
  if (!p.cancelado_em || !p.data_inicio) return 0;
  const ms =
    new Date(p.cancelado_em).getTime() - new Date(p.data_inicio).getTime();
  return Math.max(0, Math.round(ms / DIA));
}

/** Novos pagantes: planos pagos iniciados nos últimos N dias. */
export function novosPagantes(planos: UserPlan[], dias = 30): UserPlan[] {
  const limite = Date.now() - dias * DIA;
  return planos.filter(
    (p) =>
      isPago(p.plano) &&
      p.data_inicio &&
      new Date(p.data_inicio).getTime() >= limite,
  );
}

/** Série de MRR dos últimos `meses` meses (aproximada por data_inicio/fim). */
export function serieMrr(
  planos: UserPlan[],
  meses = 6,
): { mes: string; mrr: number }[] {
  const agora = new Date();
  const out: { mes: string; mrr: number }[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const ref = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() - i + 1, 0);
    const rotulo = new Intl.DateTimeFormat("pt-BR", {
      month: "short",
    }).format(ref);
    const mrr = planos
      .filter((p) => {
        if (!isPago(p.plano)) return false;
        const inicio = p.data_inicio ? new Date(p.data_inicio) : null;
        if (!inicio || inicio > fimMes) return false;
        const fim = p.cancelado_em
          ? new Date(p.cancelado_em)
          : p.data_fim
            ? new Date(p.data_fim)
            : null;
        if (fim && fim < ref) return false;
        return true;
      })
      .reduce((acc, p) => {
        const valor = Number(p.valor_cobrado) || 0;
        return acc + (p.plano === "premium_anual" ? valor / 12 : valor);
      }, 0);
    out.push({ mes: rotulo, mrr: Math.round(mrr) });
  }
  return out;
}
