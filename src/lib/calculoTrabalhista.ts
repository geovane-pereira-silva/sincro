// Motor de cálculo trabalhista do SINCRO.
// Funções PURAS — sem efeitos colaterais, fáceis de testar.
// Baseado na Portaria 671/2021 (Art. 19 — tolerância) e na CLT
// (Art. 71 — intervalo, Art. 73 — adicional noturno).

import {
  getZonedParts,
  resumoDoDia,
  type PontoRegistro,
} from "@/lib/ponto";

// --- Tipos ----------------------------------------------------------------

export interface JornadaConfig {
  dias_trabalho: string[]; // ex.: ['seg','ter','qua','qui','sex']
  horario_entrada: string; // "HH:MM" ou "HH:MM:SS"
  horario_saida: string; // "HH:MM" ou "HH:MM:SS"
  intervalo_minutos: number;
  tolerancia_minutos: number;
  adicional_noturno: boolean;
  banco_horas_ativo: boolean;
  banco_horas_limite_horas: number | null;
}

export const JORNADA_CONFIG_DEFAULT: JornadaConfig = {
  dias_trabalho: ["seg", "ter", "qua", "qui", "sex"],
  horario_entrada: "08:00",
  horario_saida: "17:00",
  intervalo_minutos: 60,
  tolerancia_minutos: 5,
  adicional_noturno: false,
  banco_horas_ativo: false,
  banco_horas_limite_horas: null,
};

export type StatusDia =
  | "normal"
  | "extra"
  | "falta"
  | "folga"
  | "feriado"
  | "incompleto"
  | "futuro";

export interface CalculoDia {
  // Entradas
  batidas: PontoRegistro[];
  config: JornadaConfig;

  // Resultados
  horasTrabalhadas: number; // minutos
  horasPrevistas: number; // minutos
  intervaloRealizado: number; // minutos
  intervaloMinimo: number; // minutos

  // Tolerância (Portaria 671 Art. 19)
  entradaComTolerancia: boolean;
  saidaComTolerancia: boolean;

  // Extras e faltas
  horasExtras: number; // minutos (0 se negativo)
  horasFalta: number; // minutos (0 se negativo)
  atraso: number; // minutos
  saidaAntecipada: number; // minutos

  // Adicional noturno (CLT Art. 73)
  minutosNoturnos: number;
  adicionalNoturno: number; // minutosNoturnos * 0.20

  // Intervalo
  intervaloInsuficiente: boolean;
  descontoIntervalo: number; // minutos descontados

  // Banco de horas
  bancoDia: number; // + crédito ou - débito do dia em minutos

  // Status
  status: StatusDia;

  // DSR — calculado para referência futura, não exibir na V1
  dsrDia: number;
}

// --- Feriados nacionais (hardcoded, expansível) ---------------------------

// Feriados nacionais fixos + móveis 2024/2025/2026 (formato YYYY-MM-DD).
export const FERIADOS_NACIONAIS = new Set<string>([
  // 2024
  "2024-01-01", // Confraternização Universal
  "2024-02-12", // Carnaval (segunda)
  "2024-02-13", // Carnaval (terça)
  "2024-03-29", // Sexta-feira Santa
  "2024-04-21", // Tiradentes
  "2024-05-01", // Dia do Trabalho
  "2024-05-30", // Corpus Christi
  "2024-09-07", // Independência
  "2024-10-12", // Nossa Senhora Aparecida
  "2024-11-02", // Finados
  "2024-11-15", // Proclamação da República
  "2024-11-20", // Consciência Negra
  "2024-12-25", // Natal
  // 2025
  "2025-01-01",
  "2025-03-03", // Carnaval (segunda)
  "2025-03-04", // Carnaval (terça)
  "2025-04-18", // Sexta-feira Santa
  "2025-04-21", // Tiradentes
  "2025-05-01",
  "2025-06-19", // Corpus Christi
  "2025-09-07",
  "2025-10-12",
  "2025-11-02",
  "2025-11-15",
  "2025-11-20", // Consciência Negra (feriado nacional a partir de 2024)
  "2025-12-25",
  // 2026
  "2026-01-01",
  "2026-02-16", // Carnaval (segunda)
  "2026-02-17", // Carnaval (terça)
  "2026-04-03", // Sexta-feira Santa
  "2026-04-21",
  "2026-05-01",
  "2026-06-04", // Corpus Christi
  "2026-09-07",
  "2026-10-12",
  "2026-11-02",
  "2026-11-15",
  "2026-11-20",
  "2026-12-25",
]);

// --- Utilidades de tempo --------------------------------------------------

// Índice do dia da semana no fuso -> chave em dias_trabalho.
const DIA_SEMANA_KEY = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

export function diaSemanaKey(date: Date, tz: string): string {
  // getZonedParts dá ano/mês/dia no fuso; construímos um Date UTC ao meio-dia
  // para descobrir o dia da semana sem risco de borda.
  const p = getZonedParts(date, tz);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day, 12));
  return DIA_SEMANA_KEY[d.getUTCDay()];
}

export function dayKeyFromDate(date: Date, tz: string): string {
  const p = getZonedParts(date, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

// Converte "HH:MM[:SS]" em minutos desde a meia-noite.
export function parseHoraParaMinutos(hora: string): number {
  const [hh = "0", mm = "0"] = hora.split(":");
  return Number(hh) * 60 + Number(mm);
}

// Carga horária diária (em minutos) DERIVADA dos horários da jornada:
// (saída - entrada - intervalo), tratando a virada de meia-noite.
// É a única fonte da carga: o usuário informa os horários, não o total.
export function cargaDiariaMinutos(config: {
  horario_entrada: string;
  horario_saida: string;
  intervalo_minutos: number;
}): number {
  const ent = parseHoraParaMinutos(config.horario_entrada);
  let sai = parseHoraParaMinutos(config.horario_saida);
  if (sai <= ent) sai += 24 * 60; // cruza a meia-noite
  return Math.max(0, sai - ent - Math.max(0, config.intervalo_minutos));
}

// Minutos desde a meia-noite (no fuso) de um instante ISO.
function minutosDoDia(iso: string, tz: string): number {
  const p = getZonedParts(new Date(iso), tz);
  return p.hour * 60 + p.minute;
}

// --- Intervalo mínimo legal (CLT Art. 71) ---------------------------------

// Retorna o intervalo mínimo legal em minutos dada a jornada trabalhada.
export function intervaloMinimoLegal(horasTrabalhadasMin: number): number {
  if (horasTrabalhadasMin > 6 * 60) return 60;
  if (horasTrabalhadasMin > 4 * 60) return 15;
  return 0;
}

// --- Adicional noturno (CLT Art. 73) --------------------------------------

// Conta minutos trabalhados no período noturno (22:00 às 05:00) entre entrada e
// saída, tratando a janela que cruza a meia-noite. Recebe instantes ISO.
export function calcularMinutosNoturnos(
  entradaIso: string,
  saidaIso: string,
  tz: string,
): number {
  const inicio = minutosDoDia(entradaIso, tz); // 0..1439
  let fim = minutosDoDia(saidaIso, tz);
  // Se a saída for "antes" da entrada no relógio, cruzou a meia-noite.
  if (fim < inicio) fim += 24 * 60;

  let noturno = 0;
  // Amostra minuto a minuto sobre o intervalo trabalhado.
  for (let m = inicio; m < fim; m++) {
    const rel = m % (24 * 60);
    if (rel >= 22 * 60 || rel < 5 * 60) noturno++;
  }
  return noturno;
}

// --- Motor principal ------------------------------------------------------

export function calcularDia(params: {
  date: Date;
  batidas: PontoRegistro[];
  config: JornadaConfig;
  cargaHorariaDiaria: number; // horas
  tz: string;
  agora?: Date; // instante "agora" para detectar dias futuros
}): CalculoDia {
  const { date, batidas, config, cargaHorariaDiaria, tz, agora } = params;

  const resumo = resumoDoDia(batidas, cargaHorariaDiaria);
  const tol = Math.max(0, config.tolerancia_minutos);

  const diaKey = diaSemanaKey(date, tz);
  const dayStr = dayKeyFromDate(date, tz);
  const ehDiaTrabalho = config.dias_trabalho.includes(diaKey);
  const ehFeriado = FERIADOS_NACIONAIS.has(dayStr);

  // Dia ainda não ocorrido (posterior a hoje no fuso do usuário): não conta
  // como falta nem gera saldo negativo. Comparação de chaves YYYY-MM-DD.
  const hojeStr = dayKeyFromDate(agora ?? new Date(), tz);
  const ehFuturo = dayStr > hojeStr;

  const horasPrevistas = ehDiaTrabalho ? cargaHorariaDiaria * 60 : 0;

  const temEntrada = !!resumo.entrada;
  const temSaida = !!resumo.saida;

  // Edge case: batida de saída anterior (ou igual) à entrada = dado inválido.
  // Ignoramos o par e o dia é tratado como incompleto.
  const saidaInvalida =
    temEntrada &&
    temSaida &&
    new Date(resumo.saida!.data_hora).getTime() <=
      new Date(resumo.entrada!.data_hora).getTime();

  const saidaValida = temSaida && !saidaInvalida;
  const completo = temEntrada && saidaValida;

  const intervaloRealizado = Math.max(0, Math.round(resumo.intervaloMin));

  // Presença bruta (entrada→saída), da qual se descontam os intervalos.
  const brutoPresenca = completo
    ? Math.round(resumo.trabalhadoMin + intervaloRealizado)
    : 0;

  // Base líquida trabalhada (já descontado o intervalo realizado).
  let horasTrabalhadas = completo ? Math.round(resumo.trabalhadoMin) : 0;

  // --- Intervalo insuficiente (CLT Art. 71) -------------------------------
  // Mínimo legal calculado sobre a jornada; usa o maior entre o legal e o
  // mínimo configurado pelo usuário.
  const minimoLegal = intervaloMinimoLegal(brutoPresenca);
  const intervaloMinimo = Math.max(minimoLegal, Math.max(0, config.intervalo_minutos));

  let intervaloInsuficiente = false;
  let descontoIntervalo = 0;
  if (completo && intervaloMinimo > 0 && intervaloRealizado < intervaloMinimo) {
    intervaloInsuficiente = true;
    descontoIntervalo = intervaloMinimo - intervaloRealizado;
    // Considera o intervalo mínimo como consumido e ainda desconta a
    // diferença suprimida (Art. 71 §4) das horas contadas.
    horasTrabalhadas = Math.max(
      0,
      brutoPresenca - intervaloMinimo - descontoIntervalo,
    );
  }

  // --- Tolerância na entrada / saída (Portaria 671 Art. 19) ---------------
  // Ao ultrapassar a tolerância, computa apenas o excedente (a tolerância é
  // sempre "perdoada").
  let atraso = 0;
  let saidaAntecipada = 0;
  let entradaComTolerancia = true;
  let saidaComTolerancia = true;

  if (ehDiaTrabalho && !ehFeriado && temEntrada && !saidaInvalida) {
    const entMin = minutosDoDia(resumo.entrada!.data_hora, tz);
    const previstoEnt = parseHoraParaMinutos(config.horario_entrada);
    const diff = entMin - previstoEnt;
    if (diff > tol) {
      atraso = diff - tol;
      entradaComTolerancia = false;
    }
  }

  if (ehDiaTrabalho && !ehFeriado && saidaValida) {
    const saiMin = minutosDoDia(resumo.saida!.data_hora, tz);
    const previstoSai = parseHoraParaMinutos(config.horario_saida);
    const diff = previstoSai - saiMin;
    if (diff > tol) {
      saidaAntecipada = diff - tol;
      saidaComTolerancia = false;
    }
  }

  // --- Horas extras / falta ----------------------------------------------
  // Extra conta integralmente; falta é perdoada até a tolerância.
  let horasExtras = 0;
  let horasFalta = 0;
  if (completo && ehDiaTrabalho && !ehFeriado) {
    const delta = horasTrabalhadas - horasPrevistas;
    if (delta > tol) {
      horasExtras = delta;
    } else if (-delta > tol) {
      horasFalta = -delta - tol;
    }
  } else if (ehDiaTrabalho && !ehFeriado && !completo) {
    // Dia de trabalho sem par completo: não computa extra nem atraso;
    // a falta só é contabilizada quando não há nenhuma batida (status falta)
    // E o dia já passou — dias futuros nunca contam como falta.
    if (batidas.length === 0 && !ehFuturo) {
      horasFalta = horasPrevistas;
    }
  }

  // --- Adicional noturno (CLT Art. 73) -----------------------------------
  let minutosNoturnos = 0;
  let adicionalNoturno = 0;
  if (config.adicional_noturno && completo) {
    minutosNoturnos = calcularMinutosNoturnos(
      resumo.entrada!.data_hora,
      resumo.saida!.data_hora,
      tz,
    );
    adicionalNoturno = Math.round(minutosNoturnos * 0.2);
  }

  // --- Banco de horas -----------------------------------------------------
  // Crédito/débito do dia = trabalhado - previsto (em dias de trabalho).
  let bancoDia = 0;
  if (config.banco_horas_ativo) {
    if (ehDiaTrabalho && !ehFeriado && completo) {
      bancoDia = horasTrabalhadas - horasPrevistas;
    } else if ((!ehDiaTrabalho || ehFeriado) && completo) {
      // Trabalho em folga/feriado entra 100% como crédito.
      bancoDia = horasTrabalhadas;
    } else if (ehDiaTrabalho && !ehFeriado && batidas.length === 0) {
      bancoDia = -horasPrevistas;
    }
  }

  // --- DSR (referência futura) -------------------------------------------
  // Proporção diária do descanso semanal: 1 dia de descanso a cada 6
  // trabalhados => carga/6 por dia efetivamente trabalhado.
  const dsrDia =
    completo && ehDiaTrabalho && !ehFeriado
      ? Math.round(horasPrevistas / 6)
      : 0;

  // --- Status -------------------------------------------------------------
  let status: StatusDia;
  if (ehFeriado) {
    status = "feriado";
  } else if (!ehDiaTrabalho) {
    status = "folga";
  } else if (batidas.length === 0) {
    status = "falta";
  } else if (!completo) {
    status = "incompleto";
  } else if (horasExtras > 0) {
    status = "extra";
  } else if (horasFalta > 0) {
    status = "falta";
  } else {
    status = "normal";
  }



  return {
    batidas,
    config,
    horasTrabalhadas,
    horasPrevistas,
    intervaloRealizado,
    intervaloMinimo,
    entradaComTolerancia,
    saidaComTolerancia,
    horasExtras,
    horasFalta,
    atraso,
    saidaAntecipada,
    minutosNoturnos,
    adicionalNoturno,
    intervaloInsuficiente,
    descontoIntervalo,
    bancoDia,
    status,
    dsrDia,
  };
}

// --- Rótulos e cores de status -------------------------------------------

export const STATUS_INFO: Record<
  StatusDia,
  { label: string; classes: string }
> = {
  normal: {
    label: "Normal",
    classes: "bg-positivo/10 text-positivo",
  },
  extra: {
    label: "Extra",
    classes: "bg-ponto-entrada/10 text-ponto-entrada",
  },
  falta: {
    label: "Falta",
    classes: "bg-negativo/10 text-negativo",
  },
  folga: {
    label: "Folga",
    classes: "bg-secondary text-muted-foreground",
  },
  feriado: {
    label: "Feriado",
    classes: "bg-ponto-entrada-intervalo/10 text-ponto-entrada-intervalo",
  },
  incompleto: {
    label: "Incompleto",
    classes: "bg-ponto-saida-intervalo/10 text-ponto-saida-intervalo",
  },
};

// Formata minutos com sinal fixo (ex.: "+02:30" / "-01:15").
export function formatBanco(min: number): string {
  const arred = Math.round(min);
  const sign = arred < 0 ? "-" : "+";
  const abs = Math.abs(arred);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Formata minutos como duração absoluta "HH:MM".
export function formatHoraMin(min: number): string {
  const abs = Math.abs(Math.round(min));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
