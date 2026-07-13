// Estado de conexão + fila de pontos offline (IndexedDB).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  contarBatidasPendentes,
  estaOnline,
  sincronizarBatidas,
} from "@/lib/pontoOffline";

export function usePontoOffline(onSincronizado?: (n: number) => void) {
  const [online, setOnline] = useState<boolean>(estaOnline());
  const [pendentes, setPendentes] = useState<number>(0);

  const atualizarPendentes = useCallback(async () => {
    setPendentes(await contarBatidasPendentes());
  }, []);

  const sincronizar = useCallback(async () => {
    if (!estaOnline()) return;
    const { sincronizadas } = await sincronizarBatidas(supabase);
    await atualizarPendentes();
    if (sincronizadas > 0) onSincronizado?.(sincronizadas);
  }, [atualizarPendentes, onSincronizado]);

  useEffect(() => {
    void atualizarPendentes();
    const handleOnline = () => {
      setOnline(true);
      void sincronizar();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    // Tenta sincronizar ao montar (caso tenha ficado algo da sessão anterior).
    void sincronizar();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [atualizarPendentes, sincronizar]);

  return { online, pendentes, sincronizar, atualizarPendentes };
}
