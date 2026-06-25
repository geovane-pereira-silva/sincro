// Lógica de negócio e utilidades de fuso horário do PontoLivre.

export const TIPO_ORDEM = [
  "entrada",
  "saida_intervalo",
  "entrada_intervalo",
  "saida",
] as const;

export type Tipo = (typeof TIPO_ORDEM)[number];

export interface PontoRegistro {
  id: string;
  user_id: string;
  tipo: Tipo;
  data_hora: string; // ISO UTC
  data_hora_original: string; // ISO UTC
  foi_editado: boolean;
  justificativa: string | null;
  origem: string;
  created_at: string;
}

export interface Profile {
  id: string;
  nome_completo: string | null;
  email: string;
  avatar_url: string | null;
  profissao: string | null;
  carga_horaria_diaria: number;
  timezone: string;
}

export const TIPO_INFO: Record<
  Tipo,
  { label: string; acao: string; colorClass: string; dot: string }
> = {
  entrada: {
    label: "Entrada",
    acao: "Registrar entrada",
    colorClass:
      "bg-ponto-entrada text-ponto-entrada-foreground hover:bg-ponto-entrada/90",
    dot: "bg-ponto-entrada",
  },
  saida_intervalo: {
    label: "Saída intervalo",
    acao: "Registrar saída intervalo",
    colorClass:
      "bg-ponto-saida-intervalo text-ponto-saida-intervalo-foreground hover:bg-ponto-saida-intervalo/90",
    dot: "bg-ponto-saida-intervalo",
  },
  entrada_intervalo: {
    label: "Entrada intervalo",
    acao: "Registrar entrada intervalo",
    colorClass:
      "bg-ponto-entrada-intervalo text-ponto-entrada-intervalo-foreground hover:bg-ponto-entrada-intervalo/90",
    dot: "bg-ponto-entrada-intervalo",
  },
  saida: {
    label: "Saída",
    acao: "Registrar saída",
    colorClass: "bg-ponto-saida text-ponto-saida-foreground hover:bg-ponto-saida/90",
    dot: "bg-ponto-saida",
  },
};

export const TIMEZONES_BR: { value: string; label: string }[] = [
  { value: "America/Sao_Paulo", label: "Brasília (GMT-3)" },
  { value: "America/Bahia", label: "Salvador (GMT-3)" },
  { value: "America/Fortaleza", label: "Fortaleza (GMT-3)" },
  { value: "America/Recife", label: "Recife (GMT-3)" },
  { value: "America/Belem", label: "Belém (GMT-3)" },
  { value: "America/Cuiaba", label: "Cuiabá (GMT-4)" },
  { value: "America/Campo_Grande", label: "Campo Grande (GMT-4)" },
  { value: "America/Manaus", label: "Manaus (GMT-4)" },
  { value: "America/Porto_Velho", label: "Porto Velho (GMT-4)" },
  { value: "America/Boa_Vista", label: "Boa Vista (GMT-4)" },
  { value: "America/Rio_Branco", label: "Rio Branco (GMT-5)" },
  { value: "America/Noronha", label: "Fernando de Noronha (GMT-2)" },
];

// --- Fuso horário ---------------------------------------------------------

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function getZonedParts(date: Date, tz: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>(
    (acc, p) => {
      acc[p.type] = p.value;
      return acc;
    },
    {},
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function tzOffsetMs(date: Date, tz: string): number {
  const p = getZonedParts(date, tz);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - date.getTime();
}

// Converte um horário de "relógio de parede" no fuso para o instante UTC real.
export function zonedWallToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  tz: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset = tzOffsetMs(new Date(guess), tz);
  return new Date(guess - offset);
}

export function dayKeyInTz(date: Date, tz: string): string {
  const p = getZonedParts(date, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function formatTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatTimeFull(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

export function formatDateLong(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

// --- Sequência de batidas --------------------------------------------------

export function nextTipo(todayCount: number): Tipo | null {
  if (todayCount >= TIPO_ORDEM.length) return null;
  return TIPO_ORDEM[todayCount];
}

export function saudacao(tz: string): string {
  const h = getZonedParts(new Date(), tz).hour;
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

// --- Cálculo de horas ------------------------------------------------------

export interface DiaResumo {
  entrada?: PontoRegistro;
  saidaIntervalo?: PontoRegistro;
  entradaIntervalo?: PontoRegistro;
  saida?: PontoRegistro;
  trabalhadoMin: number; // minutos trabalhados (líquido)
  intervaloMin: number;
  saldoMin: number; // trabalhado - carga
}

export function resumoDoDia(
  registros: PontoRegistro[],
  cargaHorariaDiaria: number,
): DiaResumo {
  const entrada = registros.find((r) => r.tipo === "entrada");
  const saidaIntervalo = registros.find((r) => r.tipo === "saida_intervalo");
  const entradaIntervalo = registros.find((r) => r.tipo === "entrada_intervalo");
  const saida = [...registros].reverse().find((r) => r.tipo === "saida");

  let intervaloMin = 0;
  if (saidaIntervalo && entradaIntervalo) {
    intervaloMin =
      (new Date(entradaIntervalo.data_hora).getTime() -
        new Date(saidaIntervalo.data_hora).getTime()) /
      60000;
  }

  let trabalhadoMin = 0;
  if (entrada && saida) {
    const bruto =
      (new Date(saida.data_hora).getTime() -
        new Date(entrada.data_hora).getTime()) /
      60000;
    trabalhadoMin = Math.max(0, bruto - Math.max(0, intervaloMin));
  }

  const saldoMin = entrada && saida ? trabalhadoMin - cargaHorariaDiaria * 60 : 0;

  return {
    entrada,
    saidaIntervalo,
    entradaIntervalo,
    saida,
    trabalhadoMin,
    intervaloMin: Math.max(0, intervaloMin),
    saldoMin,
  };
}

export function formatDuracao(min: number): string {
  const sign = min < 0 ? "-" : "";
  const abs = Math.abs(Math.round(min));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${String(m).padStart(2, "0")}`;
}

export function formatSaldo(min: number): string {
  if (Math.round(min) === 0) return "0h00";
  const sign = min > 0 ? "+" : "-";
  const abs = Math.abs(Math.round(min));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${String(m).padStart(2, "0")}`;
}

// --- Agrupamento -----------------------------------------------------------

export function agruparPorDia(
  registros: PontoRegistro[],
  tz: string,
): { dayKey: string; registros: PontoRegistro[] }[] {
  const mapa = new Map<string, PontoRegistro[]>();
  for (const r of registros) {
    const key = dayKeyInTz(new Date(r.data_hora), tz);
    const arr = mapa.get(key) ?? [];
    arr.push(r);
    mapa.set(key, arr);
  }
  return [...mapa.entries()]
    .map(([dayKey, regs]) => ({
      dayKey,
      registros: regs.sort(
        (a, b) =>
          new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime(),
      ),
    }))
    .sort((a, b) => (a.dayKey < b.dayKey ? 1 : -1));
}

export function diasDoMes(ano: number, mes: number): string[] {
  // mes: 1-12
  const total = new Date(ano, mes, 0).getDate();
  const dias: string[] = [];
  for (let d = 1; d <= total; d++) {
    dias.push(`${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return dias;
}

export function nomeMes(ano: number, mes: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(ano, mes - 1, 1));
}
