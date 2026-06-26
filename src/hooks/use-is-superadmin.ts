import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Verifica se o usuário logado possui o papel de superadmin. */
export function useIsSuperadmin(userId: string | undefined) {
  return useQuery({
    queryKey: ["is-superadmin", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!)
        .eq("role", "superadmin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}
