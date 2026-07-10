// Tipos e rótulos do sistema de solicitações.
import type { Tables } from "@/integrations/supabase/types";

export type Solicitacao = Tables<"solicitacoes">;
export type DiaEspecial = Tables<"dias_especiais">;

export type TipoSolicitacao =
  | "ajuste_ponto"
  | "abono"
  | "hora_extra"
  | "ferias"
  | "folga";

export type StatusSolicitacao =
  | "pendente"
  | "aprovado"
  | "rejeitado"
  | "cancelado";

export const TIPO_SOLICITACAO_LABEL: Record<TipoSolicitacao, string> = {
  ajuste_ponto: "Ajuste de ponto",
  abono: "Abono",
  hora_extra: "Horas extras",
  ferias: "Férias",
  folga: "Folga",
};

export const TIPO_SOLICITACAO_DESC: Record<TipoSolicitacao, string> = {
  ajuste_ponto: "Esqueci de bater ou horário errado",
  abono: "Atestado, falta justificada ou folga",
  hora_extra: "Justificar horas trabalhadas além do previsto",
  ferias: "Solicitar período de férias",
  folga: "Solicitar folga compensatória",
};

// Classes de cor (pills) usando tokens semânticos do design system.
export const TIPO_SOLICITACAO_CLASSE: Record<TipoSolicitacao, string> = {
  ajuste_ponto: "bg-ponto-entrada-intervalo/15 text-ponto-entrada-intervalo",
  abono: "bg-ponto-saida-intervalo/15 text-ponto-saida-intervalo",
  hora_extra: "bg-primary/15 text-primary",
  ferias: "bg-ponto-entrada/15 text-ponto-entrada",
  folga: "bg-muted text-muted-foreground",
};

export const STATUS_SOLICITACAO_LABEL: Record<StatusSolicitacao, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  cancelado: "Cancelado",
};

export const STATUS_SOLICITACAO_CLASSE: Record<StatusSolicitacao, string> = {
  pendente: "bg-ponto-saida-intervalo/15 text-ponto-saida-intervalo",
  aprovado: "bg-ponto-entrada/15 text-ponto-entrada",
  rejeitado: "bg-ponto-saida/15 text-ponto-saida",
  cancelado: "bg-muted text-muted-foreground",
};

export const TIPO_BATIDA_LABEL: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
  entrada_intervalo: "Volta do intervalo",
  saida_intervalo: "Saída para intervalo",
};

export function fmtDataRef(data: string | null): string {
  if (!data) return "—";
  const [y, m, d] = data.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));
}
