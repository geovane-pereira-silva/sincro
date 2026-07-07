// Tipos e utilidades do módulo corporativo (empresas / colaboradores / jornadas).
import type { Tables } from "@/integrations/supabase/types";

export type Empresa = Tables<"empresas">;
export type Setor = Tables<"setores">;
export type Colaborador = Tables<"colaboradores">;
export type JornadaEmpresa = Tables<"jornadas_empresa">;
export type ColaboradorJornada = Tables<"colaborador_jornadas">;

/* ------------------------------------------------------------------ */
/* Planos de empresa                                                  */
/* ------------------------------------------------------------------ */
export type PlanoEmpresa = "start" | "flow" | "nexus";

export const PLANO_EMPRESA_LABEL: Record<PlanoEmpresa, string> = {
  start: "Start",
  flow: "Flow",
  nexus: "Nexus",
};

export const PLANO_EMPRESA_CLASSE: Record<PlanoEmpresa, string> = {
  start: "bg-muted text-muted-foreground",
  flow: "bg-ponto-entrada/15 text-ponto-entrada",
  nexus: "bg-ponto-saida-intervalo/15 text-ponto-saida-intervalo",
};

export function planoEmpresaLabel(plano: string): string {
  return PLANO_EMPRESA_LABEL[plano as PlanoEmpresa] ?? plano;
}

/* ------------------------------------------------------------------ */
/* Tipos de jornada                                                   */
/* ------------------------------------------------------------------ */
export type TipoJornada = "fixo" | "flexivel" | "escala" | "homeoffice";

export const TIPO_JORNADA_LABEL: Record<TipoJornada, string> = {
  fixo: "Fixa",
  flexivel: "Flexível",
  escala: "Escala",
  homeoffice: "Home Office",
};

export const TIPO_JORNADA_CLASSE: Record<TipoJornada, string> = {
  fixo: "bg-ponto-entrada/15 text-ponto-entrada",
  flexivel: "bg-ponto-saida-intervalo/15 text-ponto-saida-intervalo",
  escala: "bg-ponto-entrada-intervalo/15 text-ponto-entrada-intervalo",
  homeoffice: "bg-ponto-saida/15 text-ponto-saida",
};

export function tipoJornadaLabel(tipo: string): string {
  return TIPO_JORNADA_LABEL[tipo as TipoJornada] ?? tipo;
}

/* ------------------------------------------------------------------ */
/* Dias da semana (para jornadas fixas)                                */
/* ------------------------------------------------------------------ */
export const DIAS_SEMANA = [
  { key: "segunda", label: "Segunda", curto: "Seg" },
  { key: "terca", label: "Terça", curto: "Ter" },
  { key: "quarta", label: "Quarta", curto: "Qua" },
  { key: "quinta", label: "Quinta", curto: "Qui" },
  { key: "sexta", label: "Sexta", curto: "Sex" },
  { key: "sabado", label: "Sábado", curto: "Sáb" },
  { key: "domingo", label: "Domingo", curto: "Dom" },
] as const;

export type DiaSemanaKey = (typeof DIAS_SEMANA)[number]["key"];

/** Quantos dias da jornada fixa possuem horários configurados. */
export function diasConfigurados(j: JornadaEmpresa): number {
  return DIAS_SEMANA.filter((d) => {
    const entrada = j[`${d.key}_entrada` as keyof JornadaEmpresa];
    const saida = j[`${d.key}_saida` as keyof JornadaEmpresa];
    return !!entrada && !!saida;
  }).length;
}

/** Normaliza "HH:MM:SS" -> "HH:MM"; retorna "—" quando vazio. */
export function fmtHora(v: string | null | undefined): string {
  if (!v) return "—";
  return v.slice(0, 5);
}

/* ------------------------------------------------------------------ */
/* Formatações auxiliares                                              */
/* ------------------------------------------------------------------ */
export function fmtCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return "—";
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return d.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

export function fmtDataBr(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}
