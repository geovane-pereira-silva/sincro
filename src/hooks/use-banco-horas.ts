import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useJornadaConfig } from "@/hooks/use-jornada-config";
import {
  calcularDia,
  formatBanco,
  JORNADA_CONFIG_DEFAULT,
} from "@/lib/calculoTrabalhista";
import { agruparPorDia, type PontoRegistro } from "@/lib/ponto";

export interface BancoHorasItem {
  data: Date;
  bancoDia: number;
  saldoAcumulado: number;
}

export interface BancoHoras {
  ativo: boolean;
  saldoAtual: number; // minutos
  saldoFormatado: string; // ex.: "+02:30" / "-01:15"
  historico: BancoHorasItem[];
  isLoading: boolean;
}

// Saldo do banco de horas somando o bancoDia de todos os dias com registro.
export function useBancoHoras(): BancoHoras {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: config } = useJornadaConfig(user?.id);
  const tz = profile?.timezone ?? "America/Sao_Paulo";
  const carga = profile?.carga_horaria_diaria ?? 8;
  const ativo = config?.banco_horas_ativo ?? false;

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["banco-horas-registros", user?.id],
    enabled: !!user?.id && ativo,
    queryFn: async (): Promise<PontoRegistro[]> => {
      const { data, error } = await supabase
        .from("ponto_registros")
        .select("*")
        .eq("user_id", user!.id)
        .order("data_hora", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PontoRegistro[];
    },
  });

  const { saldoAtual, historico } = useMemo(() => {
    if (!ativo) return { saldoAtual: 0, historico: [] as BancoHorasItem[] };
    const cfg = config ?? JORNADA_CONFIG_DEFAULT;
    const grupos = agruparPorDia(registros, tz)
      .slice()
      .sort((a, b) => (a.dayKey < b.dayKey ? -1 : 1)); // ordem cronológica

    let acumulado = 0;
    const hist: BancoHorasItem[] = [];
    for (const g of grupos) {
      const [y, m, d] = g.dayKey.split("-").map(Number);
      const dia = new Date(Date.UTC(y, m - 1, d, 12));
      const calc = calcularDia({
        date: dia,
        batidas: g.registros,
        config: cfg,
        cargaHorariaDiaria: carga,
        tz,
      });
      acumulado += calc.bancoDia;
      hist.push({ data: dia, bancoDia: calc.bancoDia, saldoAcumulado: acumulado });
    }
    return { saldoAtual: acumulado, historico: hist };
  }, [ativo, config, registros, tz, carga]);

  return {
    ativo,
    saldoAtual,
    saldoFormatado: formatBanco(saldoAtual),
    historico,
    isLoading: ativo ? isLoading : false,
  };
}
