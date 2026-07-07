import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UserPlan } from "@/lib/financeiro";

/** Todos os planos de usuários (RLS: apenas superadmin). */
export function useUserPlans() {
  return useQuery({
    queryKey: ["admin-user-plans"],
    queryFn: async (): Promise<UserPlan[]> => {
      const { data, error } = await supabase
        .from("user_plans")
        .select("*")
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return (data ?? []) as UserPlan[];
    },
  });
}

/** Mapa user_id -> plano (para filtros e listas). */
export function usePlanoPorUsuario() {
  return useQuery({
    queryKey: ["admin-plano-por-usuario"],
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from("user_plans")
        .select("user_id, plano");
      if (error) throw error;
      const out: Record<string, string> = {};
      for (const r of data ?? []) out[r.user_id] = r.plano;
      return out;
    },
  });
}
