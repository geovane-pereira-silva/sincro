import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Tables } from "@/integrations/supabase/types";

export type ConfigNotificacoesRow = Tables<"config_notificacoes">;

export const CONFIG_NOTIF_DEFAULT = {
  lembrete_entrada: true,
  lembrete_entrada_horario: "08:00",
  lembrete_saida: true,
  lembrete_intervalo: true,
  lembrete_antecedencia_minutos: 10,
  push_habilitado: false,
};

export function useConfigNotificacoes(userId: string | undefined) {
  return useQuery({
    queryKey: ["config-notificacoes", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ConfigNotificacoesRow | null> => {
      const { data, error } = await supabase
        .from("config_notificacoes")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export interface SalvarConfigNotifInput {
  lembrete_entrada: boolean;
  lembrete_entrada_horario: string | null;
  lembrete_saida: boolean;
  lembrete_intervalo: boolean;
  lembrete_antecedencia_minutos: number;
  push_habilitado: boolean;
}

export function useSalvarConfigNotificacoes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SalvarConfigNotifInput) => {
      if (!user?.id) throw new Error("Sem usuário");
      const { error } = await supabase.from("config_notificacoes").upsert(
        { user_id: user.id, ...input },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["config-notificacoes"] }),
  });
}
