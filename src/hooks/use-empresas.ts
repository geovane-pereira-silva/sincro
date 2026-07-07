import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Empresa,
  Setor,
  Colaborador,
  JornadaEmpresa,
} from "@/lib/empresas";

/** Todas as empresas (RLS libera apenas superadmin). */
export function useEmpresas() {
  return useQuery({
    queryKey: ["admin-empresas"],
    queryFn: async (): Promise<Empresa[]> => {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Empresa[];
    },
  });
}

/** Uma empresa por id. */
export function useEmpresa(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-empresa", id],
    enabled: !!id,
    queryFn: async (): Promise<Empresa | null> => {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Empresa | null;
    },
  });
}

/** Contagem de colaboradores por empresa (todas as empresas). */
export function useColaboradoresCount() {
  return useQuery({
    queryKey: ["admin-colaboradores-count"],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("empresa_id, ativo");
      if (error) throw error;
      const out: Record<string, number> = {};
      for (const r of data ?? []) {
        out[r.empresa_id] = (out[r.empresa_id] ?? 0) + 1;
      }
      return out;
    },
  });
}

export function useSetores(empresaId: string | undefined) {
  return useQuery({
    queryKey: ["admin-setores", empresaId],
    enabled: !!empresaId,
    queryFn: async (): Promise<Setor[]> => {
      const { data, error } = await supabase
        .from("setores")
        .select("*")
        .eq("empresa_id", empresaId!)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Setor[];
    },
  });
}

export function useColaboradores(empresaId: string | undefined) {
  return useQuery({
    queryKey: ["admin-colaboradores", empresaId],
    enabled: !!empresaId,
    queryFn: async (): Promise<Colaborador[]> => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("*")
        .eq("empresa_id", empresaId!)
        .order("nome_completo");
      if (error) throw error;
      return (data ?? []) as Colaborador[];
    },
  });
}

export function useJornadasEmpresa(empresaId: string | undefined) {
  return useQuery({
    queryKey: ["admin-jornadas", empresaId],
    enabled: !!empresaId,
    queryFn: async (): Promise<JornadaEmpresa[]> => {
      const { data, error } = await supabase
        .from("jornadas_empresa")
        .select("*")
        .eq("empresa_id", empresaId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JornadaEmpresa[];
    },
  });
}

/** Batidas dos últimos N dias dos colaboradores de uma empresa (via user autônomo — placeholder). */
export function useEmpresaBatidas(empresaId: string | undefined, days = 30) {
  return useQuery({
    queryKey: ["admin-empresa-batidas", empresaId, days],
    enabled: !!empresaId,
    queryFn: async (): Promise<{ data_hora: string }[]> => {
      // Colaboradores corporativos ainda não registram ponto no fluxo autônomo;
      // retorna vazio até a integração de batidas por colaborador existir.
      return [];
    },
  });
}

/** Contagem de setores por empresa. */
export function useSetoresCount() {
  return useQuery({
    queryKey: ["admin-setores-count"],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase.from("setores").select("empresa_id");
      if (error) throw error;
      const out: Record<string, number> = {};
      for (const r of data ?? []) out[r.empresa_id] = (out[r.empresa_id] ?? 0) + 1;
      return out;
    },
  });
}

/** Contagem de jornadas por empresa. */
export function useJornadasCount() {
  return useQuery({
    queryKey: ["admin-jornadas-count"],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("jornadas_empresa")
        .select("empresa_id");
      if (error) throw error;
      const out: Record<string, number> = {};
      for (const r of data ?? []) out[r.empresa_id] = (out[r.empresa_id] ?? 0) + 1;
      return out;
    },
  });
}

/** Contagem de colaboradores ATIVOS por empresa. */
export function useColaboradoresAtivosCount() {
  return useQuery({
    queryKey: ["admin-colaboradores-ativos-count"],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("empresa_id, ativo");
      if (error) throw error;
      const out: Record<string, number> = {};
      for (const r of data ?? []) {
        if (r.ativo) out[r.empresa_id] = (out[r.empresa_id] ?? 0) + 1;
      }
      return out;
    },
  });
}
