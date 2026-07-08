import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  exportarPontosPeriodo,
  type ExportacaoPontos,
} from "@/lib/exportacao.functions";

export function useExportarPontos() {
  const fn = useServerFn(exportarPontosPeriodo);
  return (data: { userId: string; inicio: string; fim: string }) =>
    fn({ data }) as Promise<ExportacaoPontos>;
}

/** Histórico de auditoria (RLS libera apenas superadmin). */
export interface AuditoriaRow {
  id: string;
  admin_id: string;
  acao: string;
  tabela: string;
  registro_id: string;
  motivo: string | null;
  created_at: string;
}

export function useAuditoria() {
  return useQuery({
    queryKey: ["admin-auditoria"],
    queryFn: async (): Promise<AuditoriaRow[]> => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("id, admin_id, acao, tabela, registro_id, motivo, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as AuditoriaRow[];
    },
  });
}
