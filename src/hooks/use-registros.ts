import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PontoRegistro } from "@/lib/ponto";

export function useRegistros(
  userId: string | undefined,
  fromIso: string,
  toIso: string,
  scope: string,
) {
  return useQuery({
    queryKey: ["registros", userId, scope],
    enabled: !!userId,
    queryFn: async (): Promise<PontoRegistro[]> => {
      const { data, error } = await supabase
        .from("ponto_registros")
        .select("*")
        .eq("user_id", userId!)
        .gte("data_hora", fromIso)
        .lte("data_hora", toIso)
        .order("data_hora", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PontoRegistro[];
    },
  });
}
