import { useCallback, useEffect, useState } from "react";

export type PlanoFiltro =
  | "todos"
  | "free"
  | "premium_mensal"
  | "premium_anual"
  | "empresa";

const STORAGE_KEY = "sincro_admin_filtro_plano";

export const PLANO_FILTRO_OPCOES: { value: PlanoFiltro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "free", label: "Free" },
  { value: "premium_mensal", label: "Premium Mensal" },
  { value: "premium_anual", label: "Premium Anual" },
  { value: "empresa", label: "Empresa" },
];

/** Filtro de plano persistente por sessão (localStorage), compartilhado no admin. */
export function usePlanFilter() {
  const [plano, setPlanoState] = useState<PlanoFiltro>("todos");

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY) as PlanoFiltro | null;
      if (salvo) setPlanoState(salvo);
    } catch {
      // ignora
    }
  }, []);

  const setPlano = useCallback((v: PlanoFiltro) => {
    setPlanoState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      // ignora
    }
  }, []);

  return { plano, setPlano };
}

/** Aplica o filtro de plano a uma lista de itens que têm user_id. */
export function filtrarPorPlano<T extends { id: string }>(
  itens: T[],
  planoPorUsuario: Record<string, string>,
  filtro: PlanoFiltro,
): T[] {
  if (filtro === "todos") return itens;
  return itens.filter((i) => {
    const p = planoPorUsuario[i.id] ?? "free";
    return p === filtro;
  });
}
