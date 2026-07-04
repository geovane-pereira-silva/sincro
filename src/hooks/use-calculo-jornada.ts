import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useRegistros } from "@/hooks/use-registros";
import { useJornadaConfig } from "@/hooks/use-jornada-config";
import {
  calcularDia,
  JORNADA_CONFIG_DEFAULT,
  type CalculoDia,
} from "@/lib/calculoTrabalhista";
import { getZonedParts, zonedWallToUtc, dayKeyInTz } from "@/lib/ponto";

// Retorna o cálculo trabalhista completo de um dia específico.
export function useCalculoJornada(data: Date): {
  calculo: CalculoDia | null;
  isLoading: boolean;
} {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: config } = useJornadaConfig(user?.id);
  const tz = profile?.timezone ?? "America/Sao_Paulo";
  const carga = profile?.carga_horaria_diaria ?? 8;

  const { fromIso, toIso, scope } = useMemo(() => {
    const p = getZonedParts(data, tz);
    const start = zonedWallToUtc(p.year, p.month, p.day, 0, 0, 0, tz);
    const end = new Date(start.getTime() + 24 * 3600 * 1000);
    return {
      fromIso: start.toISOString(),
      toIso: end.toISOString(),
      scope: `dia-${dayKeyInTz(data, tz)}`,
    };
  }, [data, tz]);

  const { data: batidas = [], isLoading } = useRegistros(
    user?.id,
    fromIso,
    toIso,
    scope,
  );

  const calculo = useMemo(() => {
    return calcularDia({
      date: data,
      batidas,
      config: config ?? JORNADA_CONFIG_DEFAULT,
      cargaHorariaDiaria: carga,
      tz,
    });
  }, [data, batidas, config, carga, tz]);

  return { calculo, isLoading };
}
