import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  infoGestorEmpresa,
  criarGestorEmpresa,
  resetarSenhaGestor,
  type GestorInfo,
  type CredenciaisGestor,
} from "@/lib/gestor-admin.functions";

export function useInfoGestor(empresaId?: string) {
  const fn = useServerFn(infoGestorEmpresa);
  return useQuery({
    queryKey: ["gestor-empresa", empresaId],
    enabled: !!empresaId,
    queryFn: () =>
      fn({ data: { empresaId: empresaId! } }) as Promise<GestorInfo | null>,
  });
}

export function useCriarGestor() {
  const fn = useServerFn(criarGestorEmpresa);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { empresaId: string; nome: string; email: string }) =>
      fn({ data }) as Promise<CredenciaisGestor>,
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ["gestor-empresa", vars.empresaId] });
      qc.invalidateQueries({ queryKey: ["admin-empresa"] });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao criar gestor."),
  });
}

export function useResetarSenhaGestor() {
  const fn = useServerFn(resetarSenhaGestor);
  return useMutation({
    mutationFn: (data: { userId: string; empresaId: string }) =>
      fn({ data }) as Promise<{ senha: string }>,
    onError: (e: Error) => toast.error(e.message || "Erro ao redefinir senha."),
  });
}
