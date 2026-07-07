import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  salvarEmpresa,
  excluirEmpresa,
  salvarSetor,
  excluirSetor,
  salvarColaborador,
  toggleColaboradorAtivo,
  excluirColaborador,
  salvarJornada,
  duplicarJornada,
  excluirJornada,
} from "@/lib/empresas-actions.functions";

function useInvalidarEmpresas() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["admin-empresas"] });
    qc.invalidateQueries({ queryKey: ["admin-empresa"] });
    qc.invalidateQueries({ queryKey: ["admin-colaboradores-count"] });
    qc.invalidateQueries({ queryKey: ["admin-setores"] });
    qc.invalidateQueries({ queryKey: ["admin-colaboradores"] });
    qc.invalidateQueries({ queryKey: ["admin-jornadas"] });
  };
}

export function useSalvarEmpresa() {
  const fn = useServerFn(salvarEmpresa);
  const invalidar = useInvalidarEmpresas();
  return useMutation({
    mutationFn: (data: { id?: string; valores: Record<string, unknown> }) =>
      fn({ data }),
    onSuccess: () => {
      toast.success("Empresa salva.");
      invalidar();
    },
    onError: () => toast.error("Erro ao salvar empresa."),
  });
}

export function useExcluirEmpresa() {
  const fn = useServerFn(excluirEmpresa);
  const invalidar = useInvalidarEmpresas();
  return useMutation({
    mutationFn: (data: { id: string; motivo: string }) => fn({ data }),
    onSuccess: () => {
      toast.success("Empresa excluída.");
      invalidar();
    },
    onError: () => toast.error("Erro ao excluir empresa."),
  });
}

export function useSalvarSetor() {
  const fn = useServerFn(salvarSetor);
  const invalidar = useInvalidarEmpresas();
  return useMutation({
    mutationFn: (data: { id?: string; valores: Record<string, unknown> }) =>
      fn({ data }),
    onSuccess: () => {
      toast.success("Setor salvo.");
      invalidar();
    },
    onError: () => toast.error("Erro ao salvar setor."),
  });
}

export function useExcluirSetor() {
  const fn = useServerFn(excluirSetor);
  const invalidar = useInvalidarEmpresas();
  return useMutation({
    mutationFn: (data: { id: string; motivo: string }) => fn({ data }),
    onSuccess: () => {
      toast.success("Setor excluído.");
      invalidar();
    },
    onError: () => toast.error("Erro ao excluir setor."),
  });
}

export function useSalvarColaborador() {
  const fn = useServerFn(salvarColaborador);
  const invalidar = useInvalidarEmpresas();
  return useMutation({
    mutationFn: (data: {
      id?: string;
      valores: Record<string, unknown>;
      jornadaId?: string | null;
    }) => fn({ data }),
    onSuccess: () => {
      toast.success("Colaborador salvo.");
      invalidar();
    },
    onError: () => toast.error("Erro ao salvar colaborador."),
  });
}

export function useToggleColaborador() {
  const fn = useServerFn(toggleColaboradorAtivo);
  const invalidar = useInvalidarEmpresas();
  return useMutation({
    mutationFn: (data: { id: string; ativo: boolean; motivo: string }) =>
      fn({ data }),
    onSuccess: (_r, vars) => {
      toast.success(vars.ativo ? "Colaborador reativado." : "Colaborador desativado.");
      invalidar();
    },
    onError: () => toast.error("Erro ao executar ação."),
  });
}

export function useExcluirColaborador() {
  const fn = useServerFn(excluirColaborador);
  const invalidar = useInvalidarEmpresas();
  return useMutation({
    mutationFn: (data: { id: string; motivo: string }) => fn({ data }),
    onSuccess: () => {
      toast.success("Colaborador excluído.");
      invalidar();
    },
    onError: () => toast.error("Erro ao excluir colaborador."),
  });
}

export function useSalvarJornada() {
  const fn = useServerFn(salvarJornada);
  const invalidar = useInvalidarEmpresas();
  return useMutation({
    mutationFn: (data: { id?: string; valores: Record<string, unknown> }) =>
      fn({ data }),
    onSuccess: () => {
      toast.success("Jornada salva.");
      invalidar();
    },
    onError: () => toast.error("Erro ao salvar jornada."),
  });
}

export function useDuplicarJornada() {
  const fn = useServerFn(duplicarJornada);
  const invalidar = useInvalidarEmpresas();
  return useMutation({
    mutationFn: (data: { id: string }) => fn({ data }),
    onSuccess: () => {
      toast.success("Jornada duplicada.");
      invalidar();
    },
    onError: () => toast.error("Erro ao duplicar jornada."),
  });
}

export function useExcluirJornada() {
  const fn = useServerFn(excluirJornada);
  const invalidar = useInvalidarEmpresas();
  return useMutation({
    mutationFn: (data: { id: string; motivo: string }) => fn({ data }),
    onSuccess: () => {
      toast.success("Jornada excluída.");
      invalidar();
    },
    onError: () => toast.error("Erro ao excluir jornada."),
  });
}
