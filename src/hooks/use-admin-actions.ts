import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  editarPerfilAdmin,
  toggleBloqueioAdmin,
  concederPremiumLote,
  revogarPremiumAdmin,
  excluirBatidaAdmin,
  salvarNotasAdmin,
  salvarConfigAdmin,
} from "@/lib/admin-actions.functions";

/** Invalida as principais queries do admin após uma mutação. */
function useInvalidarAdmin() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    qc.invalidateQueries({ queryKey: ["admin-premium-active"] });
    qc.invalidateQueries({ queryKey: ["admin-premium-all"] });
    qc.invalidateQueries({ queryKey: ["admin-batidas-all"] });
    qc.invalidateQueries({ queryKey: ["admin-audit"] });
    qc.invalidateQueries({ queryKey: ["admin-user"] });
    qc.invalidateQueries({ queryKey: ["admin-user-premium"] });
    qc.invalidateQueries({ queryKey: ["admin-user-registros"] });
  };
}

export function useEditarPerfil() {
  const fn = useServerFn(editarPerfilAdmin);
  const invalidar = useInvalidarAdmin();
  return useMutation({
    mutationFn: (data: {
      userId: string;
      nome_completo: string | null;
      email: string;
      profissao: string | null;
      carga_horaria_diaria: number;
    }) => fn({ data }),
    onSuccess: () => {
      toast.success("Perfil atualizado.");
      invalidar();
    },
    onError: () => toast.error("Erro ao salvar. Tente novamente."),
  });
}

export function useToggleBloqueio() {
  const fn = useServerFn(toggleBloqueioAdmin);
  const invalidar = useInvalidarAdmin();
  return useMutation({
    mutationFn: (data: {
      userId: string;
      bloqueado: boolean;
      motivo: string;
    }) => fn({ data }),
    onSuccess: (_r, vars) => {
      toast.success(vars.bloqueado ? "Conta bloqueada." : "Conta desbloqueada.");
      invalidar();
    },
    onError: () => toast.error("Erro ao executar ação. Tente novamente."),
  });
}

export function useConcederPremiumLote() {
  const fn = useServerFn(concederPremiumLote);
  const invalidar = useInvalidarAdmin();
  return useMutation({
    mutationFn: (data: { userIds: string[]; dias: number; motivo: string }) =>
      fn({ data }),
    onSuccess: (_r, vars) => {
      toast.success(
        `Premium concedido a ${vars.userIds.length} usuário(s).`,
      );
      invalidar();
    },
    onError: () => toast.error("Erro ao conceder premium. Tente novamente."),
  });
}

export function useRevogarPremium() {
  const fn = useServerFn(revogarPremiumAdmin);
  const invalidar = useInvalidarAdmin();
  return useMutation({
    mutationFn: (data: { premiumId: string; motivo: string }) => fn({ data }),
    onSuccess: () => {
      toast.success("Premium revogado.");
      invalidar();
    },
    onError: () => toast.error("Erro ao revogar. Tente novamente."),
  });
}

export function useExcluirBatida() {
  const fn = useServerFn(excluirBatidaAdmin);
  const invalidar = useInvalidarAdmin();
  return useMutation({
    mutationFn: (data: { registroId: string; motivo: string }) => fn({ data }),
    onSuccess: () => {
      toast.success("Batida excluída.");
      invalidar();
    },
    onError: () => toast.error("Erro ao excluir. Tente novamente."),
  });
}

export function useSalvarNotas() {
  const fn = useServerFn(salvarNotasAdmin);
  return useMutation({
    mutationFn: (data: { userId: string; notas: string }) => fn({ data }),
    onSuccess: () => toast.success("Notas salvas."),
    onError: () => toast.error("Erro ao salvar notas."),
  });
}

export function useSalvarConfig() {
  const fn = useServerFn(salvarConfigAdmin);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { entries: { chave: string; valor: string }[] }) =>
      fn({ data }),
    onSuccess: () => {
      toast.success("Configurações salvas.");
      qc.invalidateQueries({ queryKey: ["admin-config"] });
      qc.invalidateQueries({ queryKey: ["admin-config-raw"] });
    },
    onError: () => toast.error("Erro ao salvar configurações."),
  });
}
