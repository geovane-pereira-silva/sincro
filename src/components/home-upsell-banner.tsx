import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePremium } from "@/components/premium-context";
import { UpsellBanner } from "@/components/premium-gate";
import {
  agruparPorDia,
  formatDuracao,
  resumoDoDia,
  zonedWallToUtc,
  type PontoRegistro,
  type Profile,
} from "@/lib/ponto";

const DISMISS_KEY = "sincro_home_banner_dismissed";

/**
 * Banner contextual da home. Aparece apenas para usuários gratuitos com pelo
 * menos 5 dias de uso, com opção de dispensar (persistida no localStorage).
 */
export function HomeUpsellBanner({
  profile,
  tz,
  carga,
}: {
  profile: Profile;
  tz: string;
  carga: number;
}) {
  const { isPremium, compartilhar } = usePremium();

  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  const elegivel = useMemo(() => {
    if (!profile.created_at) return false;
    const criado = new Date(profile.created_at).getTime();
    return Date.now() - criado >= 5 * 24 * 3600 * 1000;
  }, [profile.created_at]);

  const { fromIso, toIso } = useMemo(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() + 1;
    const start = zonedWallToUtc(ano, mes, 1, 0, 0, 0, tz);
    const nextMes = mes === 12 ? 1 : mes + 1;
    const nextAno = mes === 12 ? ano + 1 : ano;
    const end = zonedWallToUtc(nextAno, nextMes, 1, 0, 0, 0, tz);
    return { fromIso: start.toISOString(), toIso: end.toISOString() };
  }, [tz]);

  const ativo = !isPremium && elegivel && !dismissed;

  const { data: registros = [] } = useQuery({
    queryKey: ["banner-mes", profile.id, fromIso],
    enabled: ativo && !!profile.id,
    queryFn: async (): Promise<PontoRegistro[]> => {
      const { data, error } = await supabase
        .from("ponto_registros")
        .select("*")
        .eq("user_id", profile.id)
        .gte("data_hora", fromIso)
        .lte("data_hora", toIso)
        .order("data_hora", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PontoRegistro[];
    },
  });

  const horasMes = useMemo(() => {
    let total = 0;
    for (const grupo of agruparPorDia(registros, tz)) {
      const r = resumoDoDia(grupo.registros, carga);
      if (r.entrada && r.saida) total += r.trabalhadoMin;
    }
    return total;
  }, [registros, tz, carga]);

  if (!ativo) return null;

  function dispensar() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignora indisponibilidade de storage
    }
    setDismissed(true);
  }

  return (
    <UpsellBanner
      texto={
        <>
          Você já registrou{" "}
          <strong>{formatDuracao(horasMes)}</strong> este mês 💪 — compartilhe o
          SINCRO com outros autônomos
        </>
      }
      actionLabel="Compartilhar"
      onAction={compartilhar}
      onDismiss={dispensar}
    />
  );
}
