// Utilidades do painel super admin do SINCRO.
import { calcularStreak, dayKeyInTz } from "./ponto";

export interface PremiumRow {
  user_id: string;
  valido_ate: string;
  motivo: string;
}

/** Mapa user_id -> registro premium ativo mais distante (maior validade). */
export function premiumMap(rows: PremiumRow[]): Map<string, PremiumRow> {
  const m = new Map<string, PremiumRow>();
  for (const r of rows) {
    const ex = m.get(r.user_id);
    if (!ex || r.valido_ate > ex.valido_ate) m.set(r.user_id, r);
  }
  return m;
}

/** Calcula a streak atual de cada usuário a partir dos registros. */
export function computeStreaks(
  regs: { user_id: string; data_hora: string }[],
  tzByUser: Record<string, string>,
): Record<string, number> {
  const byUser: Record<string, Set<string>> = {};
  for (const r of regs) {
    const tz = tzByUser[r.user_id] ?? "America/Sao_Paulo";
    (byUser[r.user_id] ??= new Set()).add(
      dayKeyInTz(new Date(r.data_hora), tz),
    );
  }
  const out: Record<string, number> = {};
  for (const [uid, set] of Object.entries(byUser)) {
    out[uid] = calcularStreak(set, tzByUser[uid] ?? "America/Sao_Paulo");
  }
  return out;
}

export function formatDataCurta(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/* ------------------------------------------------------------------ */
/* Rótulos e utilidades do painel expandido                           */
/* ------------------------------------------------------------------ */

export const MOTIVO_PREMIUM_LABEL: Record<string, string> = {
  referral: "Indicação",
  streak_7: "Streak 7 dias",
  perfil_completo: "Perfil completo",
  indicado_compartilhou: "Indicado indicou",
  admin_manual: "Concessão manual",
  campanha: "Campanha",
  erro_sistema: "Correção (erro sistema)",
};

export function motivoPremiumLabel(motivo: string): string {
  return MOTIVO_PREMIUM_LABEL[motivo] ?? motivo;
}

export const ORIGEM_LABEL: Record<string, string> = {
  web: "Web",
  mobile_pwa: "PWA",
};

export function origemLabel(origem: string): string {
  return ORIGEM_LABEL[origem] ?? origem;
}

/** Dias restantes (arredondado pra cima) até uma data ISO. */
export function diasRestantes(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (24 * 3600 * 1000));
}

/** Gera e dispara o download de um CSV a partir de linhas. */
export function baixarCsv(
  nomeArquivo: string,
  cabecalho: string[],
  linhas: (string | number)[][],
): void {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const conteudo = [cabecalho, ...linhas]
    .map((row) => row.map(escape).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + conteudo], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
