import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Notificacao } from "@/lib/notificacoes";

export function useNotificacoes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id;

  const query = useQuery({
    queryKey: ["notificacoes", uid],
    enabled: !!uid,
    refetchInterval: 30000, // fallback de polling
    queryFn: async (): Promise<Notificacao[]> => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("user_id", uid!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Realtime
  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`notificacoes-${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${uid}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notificacoes", uid] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, queryClient]);

  const notificacoes = query.data ?? [];
  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  const marcarLidaMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notificacoes", uid] }),
  });

  const marcarTodasMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("user_id", uid!)
        .eq("lida", false);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notificacoes", uid] }),
  });

  return {
    notificacoes,
    naoLidas,
    isLoading: query.isLoading,
    marcarLida: (id: string) => marcarLidaMut.mutate(id),
    marcarTodasLidas: () => marcarTodasMut.mutate(),
  };
}
