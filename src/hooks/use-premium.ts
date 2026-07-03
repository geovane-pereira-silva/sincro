import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PremiumStatus {
  isPremium: boolean;
  premiumUntil: Date | null;
  isLoading: boolean;
}

/**
 * Status Premium do usuário logado.
 * - isPremium: true se existir ao menos um registro em premium_access com valido_ate > agora
 * - premiumUntil: maior validade ativa
 * A query é invalidada automaticamente após qualquer ação de desbloqueio
 * (ver verificarRecompensasPremium em src/lib/premium.ts).
 */
export function usePremiumStatus(userId: string | undefined): PremiumStatus {
  const query = useQuery({
    queryKey: ["premium", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("premium_access")
        .select("valido_ate")
        .eq("user_id", userId!)
        .gt("valido_ate", new Date().toISOString())
        .order("valido_ate", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => r.valido_ate as string);
    },
  });

  const datas = query.data ?? [];
  const isPremium = datas.length > 0;
  const premiumUntil = isPremium ? new Date(datas[0]) : null;

  return { isPremium, premiumUntil, isLoading: query.isLoading };
}
