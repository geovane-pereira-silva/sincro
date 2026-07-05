import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminConfig {
  mensagem_sistema: string;
  modo_manutencao: boolean;
  horario_manutencao: string;
  premium_dias_referral: number;
  premium_dias_streak: number;
  premium_dias_perfil: number;
  premium_dias_indicado_compartilhou: number;
}

const DEFAULTS: AdminConfig = {
  mensagem_sistema: "",
  modo_manutencao: false,
  horario_manutencao: "",
  premium_dias_referral: 30,
  premium_dias_streak: 7,
  premium_dias_perfil: 3,
  premium_dias_indicado_compartilhou: 15,
};

function parseConfig(rows: { chave: string; valor: string }[]): AdminConfig {
  const map = new Map(rows.map((r) => [r.chave, r.valor]));
  const num = (k: keyof AdminConfig, fallback: number) => {
    const v = map.get(k);
    const n = v != null ? Number(v) : NaN;
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    mensagem_sistema: map.get("mensagem_sistema") ?? "",
    modo_manutencao: map.get("modo_manutencao") === "true",
    horario_manutencao: map.get("horario_manutencao") ?? "",
    premium_dias_referral: num("premium_dias_referral", 30),
    premium_dias_streak: num("premium_dias_streak", 7),
    premium_dias_perfil: num("premium_dias_perfil", 3),
    premium_dias_indicado_compartilhou: num(
      "premium_dias_indicado_compartilhou",
      15,
    ),
  };
}

/**
 * Lê as configurações administrativas.
 * Qualquer usuário logado pode ler (necessário para banner e modo manutenção).
 */
export function useAdminConfig() {
  return useQuery({
    queryKey: ["admin-config"],
    staleTime: 60_000,
    queryFn: async (): Promise<AdminConfig> => {
      const { data, error } = await supabase
        .from("admin_config")
        .select("chave, valor");
      if (error) throw error;
      if (!data || data.length === 0) return DEFAULTS;
      return parseConfig(data);
    },
  });
}

/** Linhas cruas de configuração (para o formulário admin). */
export function useAdminConfigRaw() {
  return useQuery({
    queryKey: ["admin-config-raw"],
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from("admin_config")
        .select("chave, valor");
      if (error) throw error;
      const out: Record<string, string> = {};
      for (const r of data ?? []) out[r.chave] = r.valor;
      return out;
    },
  });
}
