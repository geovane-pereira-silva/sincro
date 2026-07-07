// Utilidades puras dos relatórios gerenciais do painel admin.
// Sem efeitos colaterais além das funções explícitas de exportação (CSV/ZIP).
import JSZip from "jszip";
import type { AdminProfile } from "@/hooks/use-admin";
import type { PlanoFiltro } from "@/hooks/use-plan-filter";

/* ------------------------------------------------------------------ */
/* Período                                                             */
/* ------------------------------------------------------------------ */
export type PeriodoPreset =
  | "hoje"
  | "semana"
  | "mes"
  | "mes_passado"
  | "3meses"
  | "personalizado";

export const PERIODO_OPCOES: { value: PeriodoPreset; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mês" },
  { value: "mes_passado", label: "Último mês" },
  { value: "3meses", label: "Últimos 3 meses" },
  { value: "personalizado", label: "Personalizado" },
];

/** Formata um Date como "YYYY-MM-DD" no fuso local. */
export function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Intervalo (inicio/fim como YYYY-MM-DD) para um preset. */
export function presetRange(preset: PeriodoPreset): {
  inicio: string;
  fim: string;
} {
  const hoje = new Date();
  const fim = toDateInput(hoje);
  switch (preset) {
    case "hoje":
      return { inicio: fim, fim };
    case "semana": {
      const d = new Date(hoje);
      const dow = (d.getDay() + 6) % 7; // segunda = 0
      d.setDate(d.getDate() - dow);
      return { inicio: toDateInput(d), fim };
    }
    case "mes": {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return { inicio: toDateInput(d), fim };
    }
    case "mes_passado": {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const f = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return { inicio: toDateInput(ini), fim: toDateInput(f) };
    }
    case "3meses": {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - 3, hoje.getDate());
      return { inicio: toDateInput(d), fim };
    }
    default:
      return { inicio: fim, fim };
  }
}

/** Timestamp de início do dia (00:00) para "YYYY-MM-DD". */
export function startOfDay(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00`).getTime();
}
/** Timestamp de fim do dia (23:59:59.999) para "YYYY-MM-DD". */
export function endOfDay(dateStr: string): number {
  return new Date(`${dateStr}T23:59:59.999`).getTime();
}

/** Um ISO cai dentro do intervalo [inicio, fim]? */
export function dentroDoPeriodo(
  iso: string | null | undefined,
  inicio: string,
  fim: string,
): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= startOfDay(inicio) && t <= endOfDay(fim);
}

/* ------------------------------------------------------------------ */
/* Filtros                                                             */
/* ------------------------------------------------------------------ */
export type OrigemFiltro = "todos" | "direto" | "indicado";
export type StatusFiltro = "todos" | "ativos" | "inativos" | "bloqueados";
/** "todos" | "autonomos" | <empresaId> */
export type EmpresaFiltro = string;

export interface FiltrosRelatorio {
  preset: PeriodoPreset;
  inicio: string;
  fim: string;
  plano: PlanoFiltro;
  origem: OrigemFiltro;
  status: StatusFiltro;
  empresa: EmpresaFiltro;
}

export function filtrosPadrao(): FiltrosRelatorio {
  const r = presetRange("mes");
  return {
    preset: "mes",
    inicio: r.inicio,
    fim: r.fim,
    plano: "todos",
    origem: "todos",
    status: "todos",
    empresa: "todos",
  };
}

export const ORIGEM_OPCOES: { value: OrigemFiltro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "direto", label: "Direto" },
  { value: "indicado", label: "Indicado" },
];

export const STATUS_OPCOES: { value: StatusFiltro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ativos", label: "Ativos" },
  { value: "inativos", label: "Inativos" },
  { value: "bloqueados", label: "Bloqueados" },
];

const SETE_DIAS = 7 * 24 * 3600 * 1000;

export interface UserAgg {
  total: number;
  ultima: string | null;
}

/** Agrega batidas por usuário: total e última data. */
export function agregarBatidas(
  batidas: { user_id: string; data_hora: string }[],
): Map<string, UserAgg> {
  const m = new Map<string, UserAgg>();
  for (const b of batidas) {
    const cur = m.get(b.user_id);
    if (!cur) {
      m.set(b.user_id, { total: 1, ultima: b.data_hora });
    } else {
      cur.total += 1;
      if (!cur.ultima || b.data_hora > cur.ultima) cur.ultima = b.data_hora;
    }
  }
  return m;
}

/**
 * Aplica os filtros aos perfis.
 * - plano usa o mapa user_id -> plano
 * - status usa bloqueado + atividade (batida nos últimos 7 dias)
 * - empresa: "autonomos" = todos os perfis; um id específico não vincula
 *   perfis autônomos (colaboradores corporativos não são perfis) => vazio.
 */
export function filtrarPerfis(
  perfis: AdminProfile[],
  opts: {
    filtros: FiltrosRelatorio;
    planoPorUsuario: Record<string, string>;
    batidasAgg: Map<string, UserAgg>;
  },
): AdminProfile[] {
  const { filtros, planoPorUsuario, batidasAgg } = opts;
  const agora = Date.now();

  // Empresa específica não mapeia para perfis autônomos.
  if (filtros.empresa !== "todos" && filtros.empresa !== "autonomos") {
    return [];
  }

  return perfis.filter((p) => {
    // plano
    if (filtros.plano !== "todos") {
      const pl = planoPorUsuario[p.id] ?? "free";
      if (pl !== filtros.plano) return false;
    }
    // origem
    if (filtros.origem === "direto" && p.referred_by) return false;
    if (filtros.origem === "indicado" && !p.referred_by) return false;
    // status
    if (filtros.status === "bloqueados" && !p.bloqueado) return false;
    if (filtros.status !== "bloqueados" && filtros.status !== "todos") {
      const ag = batidasAgg.get(p.id);
      const ativo =
        !!ag?.ultima && agora - new Date(ag.ultima).getTime() <= SETE_DIAS;
      if (filtros.status === "ativos" && (!ativo || p.bloqueado)) return false;
      if (filtros.status === "inativos" && (ativo || p.bloqueado)) return false;
    }
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Métricas de engajamento                                            */
/* ------------------------------------------------------------------ */
export interface EngajamentoMetrics {
  total: number;
  novos: number;
  taxaAtivacao: number; // %
  ativos7: number;
  mediaBatidasAtivo: number;
  emStreak: number;
}

export function calcularEngajamento(
  perfis: AdminProfile[],
  opts: {
    filtros: FiltrosRelatorio;
    batidasAgg: Map<string, UserAgg>;
    streaks: Record<string, number>;
  },
): EngajamentoMetrics {
  const { filtros, batidasAgg, streaks } = opts;
  const agora = Date.now();
  const total = perfis.length;
  const novos = perfis.filter((p) =>
    dentroDoPeriodo(p.created_at, filtros.inicio, filtros.fim),
  ).length;
  let comBatida = 0;
  let ativos7 = 0;
  let totalBatidasAtivos = 0;
  let emStreak = 0;
  for (const p of perfis) {
    const ag = batidasAgg.get(p.id);
    if (ag && ag.total > 0) comBatida++;
    const ativo =
      !!ag?.ultima && agora - new Date(ag.ultima).getTime() <= SETE_DIAS;
    if (ativo) {
      ativos7++;
      totalBatidasAtivos += ag!.total;
    }
    if ((streaks[p.id] ?? 0) >= 7) emStreak++;
  }
  return {
    total,
    novos,
    taxaAtivacao: total > 0 ? Math.round((comBatida / total) * 100) : 0,
    ativos7,
    mediaBatidasAtivo: ativos7 > 0 ? +(totalBatidasAtivos / ativos7).toFixed(1) : 0,
    emStreak,
  };
}

/** Novos cadastros por dia dentro do período. */
export function cadastrosPorDia(
  perfis: AdminProfile[],
  inicio: string,
  fim: string,
): { dia: string; valor: number }[] {
  const map = new Map<string, number>();
  const iniT = startOfDay(inicio);
  const fimT = endOfDay(fim);
  // inicializa todos os dias do período (limite de 120 pontos)
  const dias: string[] = [];
  const cursor = new Date(inicio + "T00:00:00");
  let guard = 0;
  while (cursor.getTime() <= fimT && guard < 130) {
    dias.push(toDateInput(cursor));
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }
  const agrupaSemana = dias.length > 62;
  for (const p of perfis) {
    const t = new Date(p.created_at).getTime();
    if (t < iniT || t > fimT) continue;
    const key = toDateInput(new Date(p.created_at));
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  if (!agrupaSemana) {
    return dias.map((d) => ({
      dia: d.slice(8, 10) + "/" + d.slice(5, 7),
      valor: map.get(d) ?? 0,
    }));
  }
  // agrupa por semana
  const semanas = new Map<string, number>();
  for (const [d, v] of map) {
    const dt = new Date(d + "T00:00:00");
    const dow = (dt.getDay() + 6) % 7;
    dt.setDate(dt.getDate() - dow);
    const wk = toDateInput(dt);
    semanas.set(wk, (semanas.get(wk) ?? 0) + v);
  }
  return Array.from(semanas.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([d, v]) => ({ dia: d.slice(8, 10) + "/" + d.slice(5, 7), valor: v }));
}

/* ------------------------------------------------------------------ */
/* Cohort de retenção simplificado                                     */
/* ------------------------------------------------------------------ */
export interface CohortLinha {
  janela: number;
  base: number;
  ativos: number;
  pct: number;
}

/**
 * % de usuários que ainda registraram ponto após N dias do cadastro.
 * "ativo após N dias" = possui batida em data >= cadastro + (N-1) dias.
 */
export function cohortRetencao(
  perfis: AdminProfile[],
  batidas: { user_id: string; data_hora: string }[],
  janelas: number[] = [7, 14, 30, 60, 90],
): CohortLinha[] {
  const porUser = new Map<string, number[]>();
  for (const b of batidas) {
    (porUser.get(b.user_id) ?? porUser.set(b.user_id, []).get(b.user_id)!).push(
      new Date(b.data_hora).getTime(),
    );
  }
  const agora = Date.now();
  const DIA = 24 * 3600 * 1000;
  return janelas.map((n) => {
    let base = 0;
    let ativos = 0;
    const limiteCadastro = agora - n * DIA;
    for (const p of perfis) {
      const cad = new Date(p.created_at).getTime();
      if (cad > limiteCadastro) continue; // ainda não completou a janela
      base++;
      const marco = cad + (n - 1) * DIA;
      const ts = porUser.get(p.id);
      if (ts && ts.some((t) => t >= marco)) ativos++;
    }
    return {
      janela: n,
      base,
      ativos,
      pct: base > 0 ? Math.round((ativos / base) * 100) : 0,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Exportação CSV / ZIP (UTF-8 BOM)                                    */
/* ------------------------------------------------------------------ */
function escapeCsv(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Monta o texto de um CSV (sem BOM) a partir de cabeçalho e linhas. */
export function montarCsv(
  cabecalho: string[],
  linhas: (string | number)[][],
): string {
  return [cabecalho, ...linhas]
    .map((row) => row.map(escapeCsv).join(";"))
    .join("\n");
}

/** Gera e baixa um ZIP com múltiplos CSVs (cada um com BOM UTF-8). */
export async function baixarZipCsvs(
  nomeArquivo: string,
  arquivos: { nome: string; conteudo: string }[],
): Promise<void> {
  const zip = new JSZip();
  for (const a of arquivos) {
    zip.file(a.nome, "\uFEFF" + a.conteudo);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}
