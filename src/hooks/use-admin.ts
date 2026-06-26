import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PremiumRow } from "@/lib/admin";

export interface AdminProfile {
  id: string;
  nome_completo: string | null;
  email: string;
  created_at: string;
  referral_count: number;
  referral_code: string | null;
  timezone: string;
  profissao: string | null;
}

/** Todos os perfis (RLS libera leitura completa apenas para superadmin). */
export function useAdminProfiles() {
  return useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async (): Promise<AdminProfile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, nome_completo, email, created_at, referral_count, referral_code, timezone, profissao",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Acessos premium ativos (validade no futuro). */
export function useActivePremium() {
  return useQuery({
    queryKey: ["admin-premium-active"],
    queryFn: async (): Promise<PremiumRow[]> => {
      const { data, error } = await supabase
        .from("premium_access")
        .select("user_id, valido_ate, motivo")
        .gt("valido_ate", new Date().toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Registros de ponto de todos os usuários nos últimos N dias. */
export function useAdminRegistros(days: number) {
  return useQuery({
    queryKey: ["admin-registros", days],
    queryFn: async (): Promise<
      { user_id: string; data_hora: string; tipo: string }[]
    > => {
      const since = new Date(
        Date.now() - days * 24 * 3600 * 1000,
      ).toISOString();
      const { data, error } = await supabase
        .from("ponto_registros")
        .select("user_id, data_hora, tipo")
        .gte("data_hora", since);
      if (error) throw error;
      return data ?? [];
    },
  });
}
