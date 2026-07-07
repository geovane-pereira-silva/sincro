import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  criarConviteColaborador,
  reenviarConvite,
} from "@/lib/convite.functions";

function useInvalidar() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["admin-colaboradores"] });
    qc.invalidateQueries({ queryKey: ["admin-colaboradores-count"] });
    qc.invalidateQueries({ queryKey: ["admin-colaboradores-ativos-count"] });
  };
}

export function useCriarConvite() {
  const fn = useServerFn(criarConviteColaborador);
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (data: {
      empresaId: string;
      valores: Record<string, unknown>;
      jornadaId?: string | null;
    }) => fn({ data }),
    onSuccess: () => invalidar(),
    onError: () => toast.error("Erro ao gerar convite."),
  });
}

export function useReenviarConvite() {
  const fn = useServerFn(reenviarConvite);
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (data: { id: string }) => fn({ data }),
    onSuccess: () => invalidar(),
    onError: () => toast.error("Erro ao reenviar convite."),
  });
}
