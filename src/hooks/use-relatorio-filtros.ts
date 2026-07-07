import { useCallback, useEffect, useState } from "react";
import {
  filtrosPadrao,
  presetRange,
  type FiltrosRelatorio,
  type PeriodoPreset,
} from "@/lib/relatorios";

const STORAGE_KEY = "sincro_admin_relatorio_filtros";
const PLANO_KEY = "sincro_admin_filtro_plano";

/**
 * Filtros de relatório persistidos na sessão (sessionStorage).
 * O plano é mantido em sincronia com o filtro global de plano (localStorage).
 */
export function useRelatorioFiltros() {
  const [filtros, setFiltros] = useState<FiltrosRelatorio>(() => filtrosPadrao());

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const planoGlobal = localStorage.getItem(PLANO_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FiltrosRelatorio;
        setFiltros({
          ...filtrosPadrao(),
          ...parsed,
          plano: (planoGlobal as FiltrosRelatorio["plano"]) ?? parsed.plano,
        });
      } else if (planoGlobal) {
        setFiltros((f) => ({ ...f, plano: planoGlobal as FiltrosRelatorio["plano"] }));
      }
    } catch {
      // ignora
    }
  }, []);

  const persist = useCallback((f: FiltrosRelatorio) => {
    setFiltros(f);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(f));
      localStorage.setItem(PLANO_KEY, f.plano);
    } catch {
      // ignora
    }
  }, []);

  const setPreset = useCallback(
    (preset: PeriodoPreset) => {
      setFiltros((f) => {
        if (preset === "personalizado") return { ...f, preset };
        const r = presetRange(preset);
        return { ...f, preset, inicio: r.inicio, fim: r.fim };
      });
    },
    [],
  );

  const limpar = useCallback(() => {
    const base = filtrosPadrao();
    persist(base);
  }, [persist]);

  return { filtros, setFiltros, persist, setPreset, limpar };
}
