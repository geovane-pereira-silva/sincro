// Lembretes de ponto via Web Push / Notification API. Sem service worker
// dedicado: usa notificações locais enquanto o app está aberto, com fallback
// para toast (tratado no componente que consome).

import type { JornadaConfig } from "@/lib/calculoTrabalhista";

export interface ConfigNotificacoes {
  lembrete_entrada: boolean;
  lembrete_entrada_horario: string | null;
  lembrete_saida: boolean;
  lembrete_intervalo: boolean;
  lembrete_antecedencia_minutos: number;
  push_habilitado: boolean;
}

export function pushSuportado(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function permissaoPushAtual(): NotificationPermission | "indisponivel" {
  if (!pushSuportado()) return "indisponivel";
  return Notification.permission;
}

/** Solicita permissão de notificação. Retorna true se concedida. */
export async function solicitarPermissaoPush(): Promise<boolean> {
  if (!pushSuportado()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const p = await Notification.requestPermission();
  return p === "granted";
}

/** Dispara uma notificação push local imediatamente. */
export function dispararNotificacaoPush(
  titulo: string,
  mensagem: string,
  link?: string,
): void {
  if (!pushSuportado() || Notification.permission !== "granted") return;
  const n = new Notification(titulo, {
    body: mensagem,
    icon: "/icon-192.svg",
    badge: "/icon-192.svg",
  });
  n.onclick = () => {
    window.focus();
    if (link) window.location.href = link;
    n.close();
  };
}

interface LembreteAgendado {
  timer: ReturnType<typeof setTimeout>;
}

// Guarda os timers ativos para poder cancelar ao reagendar.
let timersAtivos: LembreteAgendado[] = [];

export function cancelarLembretes(): void {
  timersAtivos.forEach((t) => clearTimeout(t.timer));
  timersAtivos = [];
}

// Converte "HH:MM" de hoje para timestamp; se já passou, retorna null.
function horarioHojeMs(hhmm: string, antecedenciaMin: number): number | null {
  const [hh, mm] = hhmm.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const alvo = new Date();
  alvo.setHours(hh, mm, 0, 0);
  const ms = alvo.getTime() - antecedenciaMin * 60000 - Date.now();
  return ms > 0 ? ms : null;
}

/**
 * Agenda lembretes locais para hoje com base na config e na jornada.
 * `onDisparo` é chamado sempre (para permitir fallback via toast quando push
 * estiver indisponível).
 */
export function agendarLembretePonto(
  config: ConfigNotificacoes,
  jornada: JornadaConfig | null,
  onDisparo: (titulo: string, mensagem: string) => void,
): void {
  cancelarLembretes();
  const antecedencia = config.lembrete_antecedencia_minutos ?? 10;

  const agenda: { horario: string | null; titulo: string; msg: string }[] = [];

  if (config.lembrete_entrada) {
    const h = config.lembrete_entrada_horario ?? jornada?.horario_entrada ?? "08:00";
    agenda.push({
      horario: h,
      titulo: "Hora de bater o ponto",
      msg: `Sua entrada está prevista para ${h}.`,
    });
  }
  if (config.lembrete_saida && jornada?.horario_saida) {
    agenda.push({
      horario: jornada.horario_saida,
      titulo: "Fim do expediente",
      msg: `Sua saída está prevista para ${jornada.horario_saida}.`,
    });
  }

  for (const item of agenda) {
    if (!item.horario) continue;
    const ms = horarioHojeMs(item.horario, antecedencia);
    if (ms === null) continue;
    const timer = setTimeout(() => {
      onDisparo(item.titulo, item.msg);
    }, ms);
    timersAtivos.push({ timer });
  }
}
