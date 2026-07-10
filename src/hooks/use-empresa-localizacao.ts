import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import type { Tables } from "@/integrations/supabase/types";

export type EmpresaLocalizacaoRow = Tables<"empresa_localizacao">;

export function useEmpresaLocalizacao(empresaId: string | undefined) {
  return useQuery({
    queryKey: ["empresa-localizacao", empresaId],
    enabled: !!empresaId,
    queryFn: async (): Promise<EmpresaLocalizacaoRow | null> => {
      const { data, error } = await supabase
        .from("empresa_localizacao")
        .select("*")
        .eq("empresa_id", empresaId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export interface SalvarLocalizacaoInput {
  endereco: string;
  latitude: number;
  longitude: number;
  raio_metros: number;
  exigir_localizacao: boolean;
}

export function useSalvarLocalizacao() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SalvarLocalizacaoInput) => {
      if (!profile?.empresa_id) throw new Error("Sem empresa vinculada");
      const { error } = await supabase.from("empresa_localizacao").upsert(
        {
          empresa_id: profile.empresa_id,
          ...input,
        },
        { onConflict: "empresa_id" },
      );
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["empresa-localizacao"] }),
  });
}
