import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import type { Solicitacao } from "@/lib/solicitacoes";
import {
  aprovarSolicitacao,
  rejeitarSolicitacao,
} from "@/lib/solicitacoes-actions.functions";

// --- Colaborador: minhas solicitações ---
export function useMinhasSolicitacoes() {
  const { user } = useAuth();
  const uid = user?.id;
  return useQuery({
    queryKey: ["solicitacoes", "minhas", uid],
    enabled: !!uid,
    queryFn: async (): Promise<Solicitacao[]> => {
      const { data, error } = await supabase
        .from("solicitacoes")
        .select("*")
        .eq("user_id", uid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface NovaSolicitacaoInput {
  tipo: string;
  data_referencia: string;
  data_inicio?: string | null;
  data_fim?: string | null;
  horario_solicitado?: string | null;
  tipo_batida?: string | null;
  motivo: string;
  anexo_url?: string | null;
}

export function useCriarSolicitacao() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NovaSolicitacaoInput) => {
      if (!user?.id) throw new Error("Sem usuário");
      if (!profile?.empresa_id) throw new Error("Sem empresa vinculada");

      const { error } = await supabase.from("solicitacoes").insert({
        user_id: user.id,
        empresa_id: profile.empresa_id,
        tipo: input.tipo,
        data_referencia: input.data_referencia,
        data_inicio: input.data_inicio ?? null,
        data_fim: input.data_fim ?? null,
        horario_solicitado: input.horario_solicitado ?? null,
        tipo_batida: input.tipo_batida ?? null,
        motivo: input.motivo,
        anexo_url: input.anexo_url ?? null,
      });
      if (error) throw error;

      // Notifica os gestores da empresa.
      const { data: gestores } = await supabase
        .from("profiles")
        .select("id")
        .eq("empresa_id", profile.empresa_id)
        .eq("tipo_conta", "gestor");
      if (gestores?.length) {
        await supabase.from("notificacoes").insert(
          gestores.map((g) => ({
            user_id: g.id,
            tipo: "solicitacao_criada" as const,
            titulo: "Nova solicitação",
            mensagem: `${profile.nome_completo ?? "Um colaborador"} enviou uma solicitação.`,
            link: "/gestor/solicitacoes",
          })),
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solicitacoes"] });
    },
  });
}

export function useCancelarSolicitacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("solicitacoes")
        .update({ status: "cancelado" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["solicitacoes"] }),
  });
}

// --- Gestor: solicitações da empresa ---
export function useSolicitacoesEmpresa() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const empresaId = profile?.empresa_id;
  return useQuery({
    queryKey: ["solicitacoes", "empresa", empresaId],
    enabled: !!empresaId,
    queryFn: async (): Promise<Solicitacao[]> => {
      const { data, error } = await supabase
        .from("solicitacoes")
        .select("*")
        .eq("empresa_id", empresaId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAprovarSolicitacao() {
  const fn = useServerFn(aprovarSolicitacao);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; observacao?: string }) => fn({ data: vars }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["solicitacoes"] }),
  });
}

export function useRejeitarSolicitacao() {
  const fn = useServerFn(rejeitarSolicitacao);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; motivo: string }) => fn({ data: vars }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["solicitacoes"] }),
  });
}
