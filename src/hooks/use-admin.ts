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
  referred_by: string | null;
  timezone: string;
  profissao: string | null;
  avatar_url: string | null;
  carga_horaria_diaria: number;
  onboarding_concluido: boolean;
  bloqueado: boolean;
}

/** Todos os perfis (RLS libera leitura completa apenas para superadmin). */
export function useAdminProfiles() {
  return useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async (): Promise<AdminProfile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, nome_completo, email, created_at, referral_count, referral_code, referred_by, timezone, profissao, avatar_url, carga_horaria_diaria, onboarding_concluido, bloqueado",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminProfile[];
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

export interface PremiumFullRow {
  id: string;
  user_id: string;
  motivo: string;
  valido_ate: string;
  created_at: string;
}

/** Todos os registros de premium (inclui expirados). */
export function useAllPremium() {
  return useQuery({
    queryKey: ["admin-premium-all"],
    queryFn: async (): Promise<PremiumFullRow[]> => {
      const { data, error } = await supabase
        .from("premium_access")
        .select("id, user_id, motivo, valido_ate, created_at")
        .order("created_at", { ascending: false });
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

export interface AdminBatida {
  id: string;
  user_id: string;
  tipo: string;
  data_hora: string;
  data_hora_original: string;
  foi_editado: boolean;
  justificativa: string | null;
  origem: string;
}

/** Todas as batidas do sistema (limitado a um teto para performance). */
export function useAllBatidas(limit = 5000) {
  return useQuery({
    queryKey: ["admin-batidas-all", limit],
    queryFn: async (): Promise<AdminBatida[]> => {
      const { data, error } = await supabase
        .from("ponto_registros")
        .select(
          "id, user_id, tipo, data_hora, data_hora_original, foi_editado, justificativa, origem",
        )
        .order("data_hora", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface AuditRow {
  id: string;
  admin_id: string;
  acao: string;
  tabela: string;
  registro_id: string;
  dados_anteriores: unknown;
  motivo: string | null;
  created_at: string;
}

/** Log de auditoria administrativa. Filtro opcional por registro. */
export function useAuditLog(registroId?: string) {
  return useQuery({
    queryKey: ["admin-audit", registroId ?? "all"],
    queryFn: async (): Promise<AuditRow[]> => {
      let q = supabase
        .from("admin_audit_log")
        .select(
          "id, admin_id, acao, tabela, registro_id, dados_anteriores, motivo, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (registroId) q = q.eq("registro_id", registroId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });
}
