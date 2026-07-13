// Lembretes de ponto via Notification API + Service Worker.
//
// Estratégia de confiabilidade:
// - Notificações são exibidas via `ServiceWorkerRegistration.showNotification`
//   (funciona no Android/Chrome, onde `new Notification()` é bloqueado) com
//   fallback para o construtor no desktop.
// - O agendamento NÃO usa um único `setTimeout` longo (que o navegador mata em
//   segundo plano no celular). Em vez disso, um verificador roda em intervalo
//   curto e também ao voltar o foco para o app, disparando o lembrete dentro de
//   uma janela ao redor do horário — muito mais confiável em dispositivos móveis.

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

// Chave pública VAPID (publicável — segura no cliente). O par privado fica
// como secret no backend (VAPID_PRIVATE_KEY) e é usado pela edge function.
export const VAPID_PUBLIC_KEY =
  "BF0y2XCvmZCRRGsxSSSOviqxp6OCkSFOxoCvwRHmVg7IyRW8ry0EYR7nB1gmb4VDVMM3hyxCKiV1Y0r8hoXskm0";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Assina o dispositivo para Web Push e persiste a subscription no backend.
 * Retorna true em caso de sucesso. Requer permissão já concedida.
 */
export async function assinarWebPush(
  salvar: (sub: {
    endpoint: string;
    p256dh: string;
    auth: string;
  }) => Promise<void>,
): Promise<boolean> {
  try {
    if (
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator) ||
      typeof window === "undefined" ||
      !("PushManager" in window)
    ) {
      return false;
    }
    const reg = await registrarServiceWorker();
    if (!reg) return false;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const json = sub.toJSON();
    const keys = json.keys ?? {};
    if (!json.endpoint || !keys.p256dh || !keys.auth) return false;
    await salvar({
      endpoint: json.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });
    return true;
  } catch (_e) {
    return false;
  }
}

/** Cancela a subscription de Web Push no dispositivo. Retorna o endpoint removido. */
export async function cancelarWebPush(): Promise<string | null> {
  try {
    const reg = await registrarServiceWorker();
    if (!reg) return null;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return null;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    return endpoint;
  } catch (_e) {
    return null;
  }
}

/** Registra o service worker (necessário para notificações no celular). */
export async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    if (!swRegistration) {
      swRegistration =
        (await navigator.serviceWorker.getRegistration("/sw.js")) ??
        (await navigator.serviceWorker.register("/sw.js"));
    }
    await navigator.serviceWorker.ready;
    return swRegistration;
  } catch (_e) {
    return null;
  }
}

/** Solicita permissão de notificação. Retorna true se concedida. */
export async function solicitarPermissaoPush(): Promise<boolean> {
  if (!pushSuportado()) return false;
  if (Notification.permission === "granted") {
    await registrarServiceWorker();
    return true;
  }
  if (Notification.permission === "denied") return false;
  const p = await Notification.requestPermission();
  if (p === "granted") await registrarServiceWorker();
  return p === "granted";
}

/** Dispara uma notificação local imediatamente (via SW, com fallback). */
export async function dispararNotificacaoPush(
  titulo: string,
  mensagem: string,
  link?: string,
): Promise<boolean> {
  if (!pushSuportado() || Notification.permission !== "granted") return false;

  const options: NotificationOptions & { renotify?: boolean } = {
    body: mensagem,
    icon: "/icon-192.svg",
    badge: "/icon-192.svg",
    tag: "lembrete-ponto",
    renotify: true,
    data: { link: link ?? "/ponto" },
  };

  // Preferir o service worker: obrigatório no Android/Chrome.
  try {
    const reg = await registrarServiceWorker();
    if (reg) {
      await reg.showNotification(titulo, options);
      return true;
    }
  } catch (_e) {
    // cai no fallback abaixo
  }

  // Fallback para desktop sem SW ativo.
  try {
    const n = new Notification(titulo, options);
    n.onclick = () => {
      window.focus();
      if (link) window.location.href = link;
      n.close();
    };
    return true;
  } catch (_e) {
    return false;
  }
}

interface ReminderAgendado {
  key: string;
  hhmm: string; // horário-alvo (já com antecedência aplicada)
  titulo: string;
  msg: string;
}

let checkTimer: ReturnType<typeof setInterval> | null = null;
let visibilityHandler: (() => void) | null = null;
let remindersAtivos: ReminderAgendado[] = [];
let onDisparoAtual: ((titulo: string, mensagem: string) => void) | null = null;

const FIRED_KEY = "sincro:lembretes-disparados";
// Janela após o horário-alvo em que o lembrete ainda pode disparar (min).
const JANELA_MIN = 30;
const CHECK_INTERVAL_MS = 30_000;

function hojeStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function lerDisparados(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { data: string; keys: string[] };
    if (parsed.data !== hojeStr()) return {};
    return Object.fromEntries(parsed.keys.map((k) => [k, true]));
  } catch (_e) {
    return {};
  }
}

function marcarDisparado(key: string): void {
  try {
    const atual = lerDisparados();
    atual[key] = true;
    localStorage.setItem(
      FIRED_KEY,
      JSON.stringify({ data: hojeStr(), keys: Object.keys(atual) }),
    );
  } catch (_e) {
    /* ignora */
  }
}

function minutosDoDia(hhmm: string): number | null {
  const [hh, mm] = hhmm.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

function verificarLembretes(): void {
  if (!onDisparoAtual || remindersAtivos.length === 0) return;
  const disparados = lerDisparados();
  const agora = new Date();
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();

  for (const r of remindersAtivos) {
    const dedupeKey = `${hojeStr()}:${r.key}`;
    if (disparados[dedupeKey]) continue;
    const alvo = minutosDoDia(r.hhmm);
    if (alvo === null) continue;
    // Dispara quando estamos entre o horário-alvo e o fim da janela.
    if (agoraMin >= alvo && agoraMin <= alvo + JANELA_MIN) {
      marcarDisparado(dedupeKey);
      onDisparoAtual(r.titulo, r.msg);
    }
  }
}

export function cancelarLembretes(): void {
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }
  if (visibilityHandler && typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", visibilityHandler);
    visibilityHandler = null;
  }
  remindersAtivos = [];
  onDisparoAtual = null;
}

// Subtrai `antecedenciaMin` de um horário "HH:MM", devolvendo "HH:MM".
function aplicarAntecedencia(hhmm: string, antecedenciaMin: number): string | null {
  const total = minutosDoDia(hhmm);
  if (total === null) return null;
  const ajustado = Math.max(0, total - antecedenciaMin);
  const hh = Math.floor(ajustado / 60);
  const mm = ajustado % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * Agenda os lembretes locais do dia com base na config e na jornada.
 * `onDisparo` é chamado sempre que um lembrete vence (permite fallback via toast
 * quando a notificação push está indisponível).
 */
export function agendarLembretePonto(
  config: ConfigNotificacoes,
  jornada: JornadaConfig | null,
  onDisparo: (titulo: string, mensagem: string) => void,
): void {
  cancelarLembretes();
  if (typeof window === "undefined") return;

  const antecedencia = config.lembrete_antecedencia_minutos ?? 10;
  const reminders: ReminderAgendado[] = [];

  if (config.lembrete_entrada) {
    const base =
      config.lembrete_entrada_horario ?? jornada?.horario_entrada ?? "08:00";
    const hhmm = aplicarAntecedencia(base, antecedencia);
    if (hhmm) {
      reminders.push({
        key: "entrada",
        hhmm,
        titulo: "Hora de bater o ponto",
        msg: `Sua entrada está prevista para ${base}.`,
      });
    }
  }

  if (config.lembrete_saida && jornada?.horario_saida) {
    const hhmm = aplicarAntecedencia(jornada.horario_saida, antecedencia);
    if (hhmm) {
      reminders.push({
        key: "saida",
        hhmm,
        titulo: "Fim do expediente",
        msg: `Sua saída está prevista para ${jornada.horario_saida}.`,
      });
    }
  }

  remindersAtivos = reminders;
  onDisparoAtual = onDisparo;
  if (reminders.length === 0) return;

  // Verifica imediatamente (caso o app abra já dentro da janela) e depois
  // periodicamente + ao voltar o foco para a aba/app.
  verificarLembretes();
  checkTimer = setInterval(verificarLembretes, CHECK_INTERVAL_MS);
  visibilityHandler = () => {
    if (document.visibilityState === "visible") verificarLembretes();
  };
  document.addEventListener("visibilitychange", visibilityHandler);
}
