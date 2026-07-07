import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Assinatura = Tables<"assinaturas">;

/** Assinatura mais recente do usuário logado (RLS: própria). */
export function useMinhaAssinatura(userId: string | undefined) {
  return useQuery({
    queryKey: ["minha-assinatura", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Assinatura | null> => {
      const { data, error } = await supabase
        .from("assinaturas")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Assinatura | null;
    },
  });
}

/** Todas as assinaturas (RLS: apenas superadmin). */
export function useAssinaturasAdmin() {
  return useQuery({
    queryKey: ["admin-assinaturas"],
    queryFn: async (): Promise<Assinatura[]> => {
      const { data, error } = await supabase
        .from("assinaturas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Assinatura[];
    },
  });
}
