import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Share2, Target, Gift, Crown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, MetricsGridSkeleton } from "@/components/admin-ui";
import { MetricCard, SectionCard } from "@/components/relatorios/shared";
import { useAdminProfiles, useAllPremium, useAllBatidas } from "@/hooks/use-admin";
import { motivoPremiumLabel, formatDataCurta, baixarCsv } from "@/lib/admin";
import { dentroDoPeriodo, agregarBatidas, type FiltrosRelatorio } from "@/lib/relatorios";

const DIA = 24 * 3600 * 1000;

export function RelatorioGamificacao({ filtros }: { filtros: FiltrosRelatorio }) {
  const { data: profiles = [], isLoading: lp } = useAdminProfiles();
  const { data: premium = [], isLoading: lpr } = useAllPremium();
  const { data: batidas = [] } = useAllBatidas();

  const nomePorId = useMemo(
    () => new Map(profiles.map((p) => [p.id, p.nome_completo || p.email])),
    [profiles],
  );
  const batidasAgg = useMemo(() => agregarBatidas(batidas), [batidas]);

  // Indicados criados no período
  const indicados = useMemo(
    () =>
      profiles.filter(
        (p) => p.referred_by && dentroDoPeriodo(p.created_at, filtros.inicio, filtros.fim),
      ),
    [profiles, filtros],
  );

  const premiumPeriodo = useMemo(
    () => premium.filter((p) => dentroDoPeriodo(p.created_at, filtros.inicio, filtros.fim)),
    [premium, filtros],
  );

  const cards = useMemo(() => {
    const total = indicados.length;
    const convertidos = indicados.filter((p) => (batidasAgg.get(p.id)?.total ?? 0) > 0).length;
    const conv = total > 0 ? Math.round((convertidos / total) * 100) : 0;
    // top indicador do período
    const porIndicador = new Map<string, number>();
    for (const p of indicados) porIndicador.set(p.referred_by!, (porIndicador.get(p.referred_by!) ?? 0) + 1);
    let topId = "";
    let topQtd = 0;
    for (const [id, q] of porIndicador) if (q > topQtd) ((topQtd = q), (topId = id));
    return {
      total,
      conv,
      premiumCount: premiumPeriodo.length,
      topNome: topId ? nomePorId.get(topId) ?? "—" : "—",
      topQtd,
    };
  }, [indicados, batidasAgg, premiumPeriodo, nomePorId]);

  // Tabela de indicações por indicador
  const tabelaIndicacoes = useMemo(() => {
    const map = new Map<
      string,
      { indicados: number; convertidos: number; premiumDias: number }
    >();
    for (const p of indicados) {
      const cur = map.get(p.referred_by!) ?? { indicados: 0, convertidos: 0, premiumDias: 0 };
      cur.indicados++;
      if ((batidasAgg.get(p.id)?.total ?? 0) > 0) cur.convertidos++;
      map.set(p.referred_by!, cur);
    }
    for (const pr of premiumPeriodo) {
      if (pr.motivo !== "referral" && pr.motivo !== "indicado_compartilhou") continue;
      const cur = map.get(pr.user_id);
      if (!cur) continue;
      cur.premiumDias += Math.max(0, Math.round((new Date(pr.valido_ate).getTime() - new Date(pr.created_at).getTime()) / DIA));
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({
        id,
        nome: nomePorId.get(id) ?? "—",
        code: profiles.find((p) => p.id === id)?.referral_code ?? "—",
        ...v,
      }))
      .sort((a, b) => b.indicados - a.indicados);
  }, [indicados, batidasAgg, premiumPeriodo, nomePorId, profiles]);

  // Tabela de premium concedidos
  const tabelaPremium = useMemo(
    () =>
      premiumPeriodo
        .map((pr) => ({
          id: pr.id,
          nome: nomePorId.get(pr.user_id) ?? "—",
          motivo: motivoPremiumLabel(pr.motivo),
          dias: Math.max(0, Math.round((new Date(pr.valido_ate).getTime() - new Date(pr.created_at).getTime()) / DIA)),
          concedido: pr.created_at,
          expira: pr.valido_ate,
          ativo: new Date(pr.valido_ate).getTime() > Date.now(),
        }))
        .sort((a, b) => new Date(b.concedido).getTime() - new Date(a.concedido).getTime()),
    [premiumPeriodo, nomePorId],
  );

  function exportar() {
    const cab = ["Indicador", "Código", "Indicados", "Convertidos", "Premium ganho (dias)"];
    const rows = tabelaIndicacoes.map((r) => [r.nome, r.code, r.indicados, r.convertidos, r.premiumDias]);
    baixarCsv("sincro-gamificacao.csv", cab, rows);
  }

  const loading = lp || lpr;

  return (
    <div className="space-y-6">
      {loading ? (
        <MetricsGridSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard icon={Share2} value={cards.total} label="Indicações no período" />
          <MetricCard icon={Target} value={`${cards.conv}%`} label="Conversão do referral" />
          <MetricCard icon={Gift} value={cards.premiumCount} label="Premium concedidos" />
          <MetricCard
            icon={Crown}
            value={cards.topQtd}
            label={`Top indicador: ${cards.topNome}`}
          />
        </div>
      )}

      <SectionCard
        title="Indicações por indicador"
        action={
          <Button size="sm" variant="outline" onClick={exportar} className="gap-1.5" disabled={tabelaIndicacoes.length === 0}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        }
      >
        {tabelaIndicacoes.length === 0 ? (
          <EmptyState title="Sem indicações no período" description="Nenhum usuário indicou amigos nesse intervalo." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Indicador</th>
                  <th className="pb-2 pr-3 font-medium">Código</th>
                  <th className="pb-2 pr-3 font-medium">Indicados</th>
                  <th className="pb-2 pr-3 font-medium">Convertidos</th>
                  <th className="pb-2 font-medium">Premium (dias)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tabelaIndicacoes.map((r) => (
                  <tr key={r.id}>
                    <td className="max-w-[180px] truncate py-2 pr-3">
                      <Link to="/admin/usuarios/$id" params={{ id: r.id }} className="font-medium text-primary hover:underline">
                        {r.nome}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">{r.code}</td>
                    <td className="py-2 pr-3 tabular-nums">{r.indicados}</td>
                    <td className="py-2 pr-3 tabular-nums">{r.convertidos}</td>
                    <td className="py-2 tabular-nums">{r.premiumDias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Premium concedidos no período">
        {tabelaPremium.length === 0 ? (
          <EmptyState title="Nenhum premium concedido" description="Nenhuma recompensa premium foi concedida nesse intervalo." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Usuário</th>
                  <th className="pb-2 pr-3 font-medium">Motivo</th>
                  <th className="pb-2 pr-3 font-medium">Dias</th>
                  <th className="pb-2 pr-3 font-medium">Concedido</th>
                  <th className="pb-2 pr-3 font-medium">Expira</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tabelaPremium.map((r) => (
                  <tr key={r.id}>
                    <td className="max-w-[180px] truncate py-2 pr-3">{r.nome}</td>
                    <td className="py-2 pr-3">{r.motivo}</td>
                    <td className="py-2 pr-3 tabular-nums">{r.dias}</td>
                    <td className="py-2 pr-3 tabular-nums">{formatDataCurta(r.concedido)}</td>
                    <td className="py-2 pr-3 tabular-nums">{formatDataCurta(r.expira)}</td>
                    <td className="py-2">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                          (r.ativo ? "bg-ponto-entrada/15 text-ponto-entrada" : "bg-muted text-muted-foreground")
                        }
                      >
                        {r.ativo ? "Ativo" : "Expirado"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
