import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  JORNADA_CONFIG_DEFAULT,
  type JornadaConfig,
} from "@/lib/calculoTrabalhista";

// Lê a configuração de jornada do usuário. Se não existir, retorna os defaults.
export function useJornadaConfig(userId: string | undefined) {
  return useQuery({
    queryKey: ["jornada-config", userId],
    enabled: !!userId,
    queryFn: async (): Promise<JornadaConfig> => {
      const { data, error } = await supabase
        .from("jornada_config")
        .select(
          "dias_trabalho, horario_entrada, horario_saida, intervalo_minutos, tolerancia_minutos, adicional_noturno, banco_horas_ativo, banco_horas_limite_horas",
        )
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return JORNADA_CONFIG_DEFAULT;
      return {
        dias_trabalho: data.dias_trabalho ?? JORNADA_CONFIG_DEFAULT.dias_trabalho,
        horario_entrada:
          data.horario_entrada ?? JORNADA_CONFIG_DEFAULT.horario_entrada,
        horario_saida: data.horario_saida ?? JORNADA_CONFIG_DEFAULT.horario_saida,
        intervalo_minutos:
          data.intervalo_minutos ?? JORNADA_CONFIG_DEFAULT.intervalo_minutos,
        tolerancia_minutos:
          data.tolerancia_minutos ?? JORNADA_CONFIG_DEFAULT.tolerancia_minutos,
        adicional_noturno:
          data.adicional_noturno ?? JORNADA_CONFIG_DEFAULT.adicional_noturno,
        banco_horas_ativo:
          data.banco_horas_ativo ?? JORNADA_CONFIG_DEFAULT.banco_horas_ativo,
        banco_horas_limite_horas:
          data.banco_horas_limite_horas ??
          JORNADA_CONFIG_DEFAULT.banco_horas_limite_horas,
      };
    },
  });
}
