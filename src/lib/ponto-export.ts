// Monta relatório de pontos por período (linhas por dia + resumo do cálculo).
// Client-safe: apenas lógica pura reutilizando o cálculo de src/lib/ponto.ts.
import {
  agruparPorDia,
  resumoDoDia,
  formatTime,
  formatDayKey,
  formatDuracao,
  formatSaldo,
  type PontoRegistro,
} from "@/lib/ponto";

export interface LinhaPonto {
  dayKey: string;
  data: string;
  entrada: string;
  saidaIntervalo: string;
  entradaIntervalo: string;
  saida: string;
  intervalo: string;
  trabalhado: string;
  saldo: string;
  editado: boolean;
}

export interface RelatorioPontos {
  linhas: LinhaPonto[];
  totalTrabalhadoMin: number;
  totalSaldoMin: number;
  diasComRegistro: number;
}

const DASH = "—";

export function montarRelatorioPontos(
  registros: PontoRegistro[],
  cargaHorariaDiaria: number,
  tz: string,
): RelatorioPontos {
  const grupos = agruparPorDia(registros, tz).slice().reverse(); // ordem crescente
  const linhas: LinhaPonto[] = [];
  let totalTrabalhadoMin = 0;
  let totalSaldoMin = 0;

  for (const g of grupos) {
    const r = resumoDoDia(g.registros, cargaHorariaDiaria);
    totalTrabalhadoMin += r.trabalhadoMin;
    totalSaldoMin += r.saldoMin;
    const editado = g.registros.some((x) => x.foi_editado);
    linhas.push({
      dayKey: g.dayKey,
      data: formatDayKey(g.dayKey),
      entrada: r.entrada ? formatTime(r.entrada.data_hora, tz) : DASH,
      saidaIntervalo: r.saidaIntervalo
        ? formatTime(r.saidaIntervalo.data_hora, tz)
        : DASH,
      entradaIntervalo: r.entradaIntervalo
        ? formatTime(r.entradaIntervalo.data_hora, tz)
        : DASH,
      saida: r.saida ? formatTime(r.saida.data_hora, tz) : DASH,
      intervalo: r.intervaloMin > 0 ? formatDuracao(r.intervaloMin) : DASH,
      trabalhado: r.trabalhadoMin > 0 ? formatDuracao(r.trabalhadoMin) : DASH,
      saldo: r.entrada && r.saida ? formatSaldo(r.saldoMin) : DASH,
      editado,
    });
  }

  return {
    linhas,
    totalTrabalhadoMin,
    totalSaldoMin,
    diasComRegistro: linhas.length,
  };
}

export const COLUNAS_PONTO = [
  "Data",
  "Entrada",
  "Saída interv.",
  "Volta interv.",
  "Saída",
  "Intervalo",
  "Trabalhado",
  "Saldo",
] as const;

export function linhaParaColunas(l: LinhaPonto): (string | number)[] {
  return [
    l.data + (l.editado ? " *" : ""),
    l.entrada,
    l.saidaIntervalo,
    l.entradaIntervalo,
    l.saida,
    l.intervalo,
    l.trabalhado,
    l.saldo,
  ];
}
