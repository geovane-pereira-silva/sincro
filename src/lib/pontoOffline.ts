// Ponto offline via IndexedDB.
//
// Quando a batida não consegue chegar ao servidor (sem conexão), ela é salva
// localmente e sincronizada automaticamente assim que a rede voltar (evento
// `online` e/ou Background Sync do Service Worker).
import type { SupabaseClient } from "@supabase/supabase-js";

const DB_NAME = "sincro-offline";
const DB_VERSION = 1;
const STORE_NAME = "batidas-pendentes";
export const SYNC_TAG = "sync-batidas";

export type TipoBatida =
  | "entrada"
  | "saida"
  | "entrada_intervalo"
  | "saida_intervalo";

export interface BatidaPendente {
  id: string; // UUID gerado localmente
  user_id: string;
  tipo: TipoBatida;
  data_hora: string; // ISO string — horário do dispositivo
  data_hora_original: string;
  justificativa: string | null;
  foi_editado: boolean;
  origem: "web" | "mobile_pwa";
  latitude: number | null;
  longitude: number | null;
  distancia_empresa_metros: number | null;
  tentativas: number;
  created_at: string;
}

function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponível"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Erro ao abrir IndexedDB"));
  });
}

export async function salvarBatidaOffline(
  batida: Omit<BatidaPendente, "tentativas">,
): Promise<void> {
  const db = await abrirDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ ...batida, tentativas: 0 });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  // Solicita Background Sync (quando suportado) para sincronizar em segundo plano.
  await registrarBackgroundSync();
}

export async function getBatidasPendentes(): Promise<BatidaPendente[]> {
  const db = await abrirDB();
  const itens = await new Promise<BatidaPendente[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve((req.result as BatidaPendente[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return itens;
}

export async function contarBatidasPendentes(): Promise<number> {
  try {
    return (await getBatidasPendentes()).length;
  } catch (_e) {
    return 0;
  }
}

async function removerBatidaSincronizada(id: string): Promise<void> {
  const db = await abrirDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function incrementarTentativa(b: BatidaPendente): Promise<void> {
  const db = await abrirDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ ...b, tentativas: b.tentativas + 1 });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Detecta erro de rede (sem conexão) para diferenciar de erros de validação. */
export function isErroDeRede(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network error") ||
    msg.includes("fetch failed") ||
    msg.includes("load failed")
  );
}

/**
 * Envia todas as batidas pendentes ao Supabase. Remove as que forem aceitas.
 * Batidas que falham por rede permanecem; falhas persistentes (10 tentativas)
 * são descartadas para não travar a fila.
 */
export async function sincronizarBatidas(
  supabase: SupabaseClient,
): Promise<{ sincronizadas: number; erros: number }> {
  let sincronizadas = 0;
  let erros = 0;
  const pendentes = await getBatidasPendentes();
  for (const b of pendentes) {
    const { error } = await supabase.from("ponto_registros").insert({
      user_id: b.user_id,
      tipo: b.tipo,
      data_hora: b.data_hora,
      data_hora_original: b.data_hora_original,
      foi_editado: b.foi_editado,
      justificativa: b.justificativa,
      origem: b.origem,
      latitude: b.latitude,
      longitude: b.longitude,
      distancia_empresa_metros: b.distancia_empresa_metros,
    });
    if (!error) {
      await removerBatidaSincronizada(b.id);
      sincronizadas++;
    } else if (isErroDeRede(error)) {
      erros++;
    } else if (b.tentativas >= 9) {
      // Falha persistente que não é de rede: descarta para não travar a fila.
      await removerBatidaSincronizada(b.id);
      erros++;
    } else {
      await incrementarTentativa(b);
      erros++;
    }
  }
  return { sincronizadas, erros };
}

async function registrarBackgroundSync(): Promise<void> {
  try {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> };
    };
    if (reg.sync) await reg.sync.register(SYNC_TAG);
  } catch (_e) {
    /* Background Sync é um extra; ignora se indisponível. */
  }
}

export function estaOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}
