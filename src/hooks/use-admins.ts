import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listarAdmins,
  concederAdmin,
  revogarAdmin,
  type AdminRow,
} from "@/lib/admins.functions";

export function useAdmins() {
  const fn = useServerFn(listarAdmins);
  return useQuery({
    queryKey: ["admin-admins"],
    queryFn: () => fn() as Promise<AdminRow[]>,
  });
}

export function useConcederAdmin() {
  const fn = useServerFn(concederAdmin);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string }) => fn({ data }),
    onSuccess: () => {
      toast.success("Administrador adicionado.");
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
    },
    onError: (e: Error) =>
      toast.error(e.message || "Erro ao adicionar administrador."),
  });
}

export function useRevogarAdmin() {
  const fn = useServerFn(revogarAdmin);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string }) => fn({ data }),
    onSuccess: () => {
      toast.success("Acesso de administrador removido.");
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
    },
    onError: (e: Error) =>
      toast.error(e.message || "Erro ao remover administrador."),
  });
}
