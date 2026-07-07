import { useMemo } from "react";
import {
  DollarSign,
  Ticket,
  TrendingUp,
  TrendingDown,
  UserPlus,
  XCircle,
  Download,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { EmptyState, MetricsGridSkeleton } from "@/components/admin-ui";
import { MetricCard, SectionCard } from "@/components/relatorios/shared";
import { useUserPlans } from "@/hooks/use-financeiro";
import { useAdminProfiles, useAllBatidas } from "@/hooks/use-admin";
import { baixarCsv } from "@/lib/admin";
import {
  calcularMrr,
  isPago,
  planoAtivo,
  diasDeUso,
  fmtMoeda,
  planoUsuarioLabel,
  type UserPlan,
} from "@/lib/financeiro";
import {
  dentroDoPeriodo,
  cohortRetencao,
  startOfDay,
  endOfDay,
  toDateInput,
  type FiltrosRelatorio,
} from "@/lib/relatorios";

const PIE_CORES = [
  "hsl(var(--ponto-entrada))",
  "hsl(var(--ponto-saida))",
  "hsl(var(--ponto-saida-intervalo))",
  "hsl(var(--ponto-entrada-intervalo))",
];

function mensal(p: UserPlan): number {
  const v = Number(p.valor_cobrado) || 0;
  return p.plano === "premium_anual" ? v / 12 : v;
}

export function RelatorioFinanceiro({ filtros }: { filtros: FiltrosRelatorio }) {
  const { data: planosAll = [], isLoading: lpl } = useUserPlans();
  const { data: profiles = [] } = useAdminProfiles();
  const { data: batidas = [] } = useAllBatidas();

  const nomePorId = useMemo(
    () => new Map(profiles.map((p) => [p.id, p.nome_completo || p.email])),
    [profiles],
  );

  const planos = useMemo(() => {
    if (filtros.plano === "todos") return planosAll;
    return planosAll.filter((p) => p.plano === filtros.plano);
  }, [planosAll, filtros.plano]);

  const metrics = useMemo(() => {
    const ativos = planos.filter(planoAtivo);
    const mrr = calcularMrr(planos);
    const ticket = ativos.length > 0 ? mrr / ativos.length : 0;
    const cancelados = planos.filter((p) =>
      dentroDoPeriodo(p.cancelado_em, filtros.inicio, filtros.fim),
    );
    const novos = planos.filter(
      (p) => isPago(p.plano) && dentroDoPeriodo(p.data_inicio, filtros.inicio, filtros.fim),
    );
    const retDias =
      cancelados.length > 0
        ? cancelados.reduce((a, p) => a + diasDeUso(p), 0) / cancelados.length
        : 0;
    const retMeses = retDias > 0 ? retDias / 30 : 12;
    const ltv = ticket * retMeses;
    const baseChurn = ativos.length + cancelados.length;
    const churnRate = baseChurn > 0 ? (cancelados.length / baseChurn) * 100 : 0;
    return {
      mrr,
      ticket,
      ltv,
      churnRate: Math.round(churnRate * 10) / 10,
      novos: novos.length,
      cancelamentos: cancelados.length,
      cancelados,
      retDias: Math.round(retDias),
    };
  }, [planos, filtros]);

  // Série semanal: receita acumulada vs cancelamentos
  const serie = useMemo(() => {
    const iniT = startOfDay(filtros.inicio);
    const fimT = endOfDay(filtros.fim);
    const semanas: { label: string; ini: number; fim: number }[] = [];
    const cursor = new Date(filtros.inicio + "T00:00:00");
    const dow = (cursor.getDay() + 6) % 7;
    cursor.setDate(cursor.getDate() - dow);
    let guard = 0;
    while (cursor.getTime() <= fimT && guard < 60) {
      const ini = cursor.getTime();
      const fimS = ini + 7 * 24 * 3600 * 1000 - 1;
      semanas.push({
        label: toDateInput(cursor).slice(5).replace("-", "/"),
        ini,
        fim: fimS,
      });
      cursor.setDate(cursor.getDate() + 7);
      guard++;
    }
    return semanas.map((s) => {
      // receita acumulada = MRR de planos iniciados até o fim da semana e não cancelados antes
      let receita = 0;
      let cancel = 0;
      for (const p of planos) {
        if (!isPago(p.plano)) continue;
        const ini = p.data_inicio ? new Date(p.data_inicio).getTime() : null;
        if (ini != null && ini <= s.fim) {
          const canc = p.cancelado_em ? new Date(p.cancelado_em).getTime() : null;
          if (!(canc && canc < s.ini)) receita += mensal(p);
        }
        const canc = p.cancelado_em ? new Date(p.cancelado_em).getTime() : null;
        if (canc != null && canc >= Math.max(s.ini, iniT) && canc <= s.fim) cancel++;
      }
      return { semana: s.label, receita: Math.round(receita), cancelamentos: cancel };
    });
  }, [planos, filtros]);

  // Transações no período
  const transacoes = useMemo(() => {
    const out: {
      id: string;
      user_id: string;
      plano: string;
      valor: number;
      tipo: string;
      data: string;
      motivo: string;
    }[] = [];
    for (const p of planos) {
      if (dentroDoPeriodo(p.cancelado_em, filtros.inicio, filtros.fim)) {
        out.push({
          id: p.id + "-c",
          user_id: p.user_id,
          plano: p.plano,
          valor: mensal(p),
          tipo: "Cancelamento",
          data: p.cancelado_em!,
          motivo: p.motivo_cancelamento || "—",
        });
      }
      if (isPago(p.plano) && dentroDoPeriodo(p.data_inicio, filtros.inicio, filtros.fim)) {
        out.push({
          id: p.id + "-u",
          user_id: p.user_id,
          plano: p.plano,
          valor: mensal(p),
          tipo: "Upgrade",
          data: p.data_inicio!,
          motivo: "—",
        });
      }
    }
    return out.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [planos, filtros]);

  const motivos = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of metrics.cancelados) {
      const key = p.motivo_cancelamento?.trim() || "Não informado";
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [metrics.cancelados]);

  const cohort = useMemo(() => cohortRetencao(profiles, batidas), [profiles, batidas]);

  function exportar() {
    const cab = ["Usuário", "Plano", "Valor mensal", "Tipo", "Data", "Motivo"];
    const rows = transacoes.map((t) => [
      nomePorId.get(t.user_id) ?? "—",
      planoUsuarioLabel(t.plano),
      fmtMoeda(t.valor),
      t.tipo,
      new Date(t.data).toLocaleDateString("pt-BR"),
      t.motivo,
    ]);
    baixarCsv("sincro-financeiro.csv", cab, rows);
  }

  return (
    <div className="space-y-6">
      {lpl ? (
        <MetricsGridSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <MetricCard icon={DollarSign} value={fmtMoeda(metrics.mrr)} label="Receita no período (MRR)" />
          <MetricCard icon={Ticket} value={fmtMoeda(metrics.ticket)} label="Ticket médio" />
          <MetricCard icon={TrendingUp} value={fmtMoeda(metrics.ltv)} label="LTV médio estimado" />
          <MetricCard icon={TrendingDown} value={`${metrics.churnRate}%`} label="Churn no período" tone="down" />
          <MetricCard icon={UserPlus} value={metrics.novos} label="Novos pagantes" />
          <MetricCard icon={XCircle} value={metrics.cancelamentos} label="Cancelamentos" tone="down" />
        </div>
      )}

      <SectionCard title="Receita acumulada vs cancelamentos (semanal)">
        {serie.length === 0 ? (
          <EmptyState title="Sem dados no período" />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line yAxisId="l" type="monotone" dataKey="receita" name="Receita" stroke="hsl(var(--ponto-entrada))" strokeWidth={2} dot={false} />
                <Line yAxisId="r" type="monotone" dataKey="cancelamentos" name="Cancelamentos" stroke="hsl(var(--ponto-saida))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Motivos de cancelamento">
          {motivos.length === 0 ? (
            <EmptyState title="Sem cancelamentos no período" />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={motivos} dataKey="value" nameKey="name" innerRadius={40} outerRadius={72}>
                    {motivos.map((_, i) => (
                      <Cell key={i} fill={PIE_CORES[i % PIE_CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Retenção">
          <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-4">
            <Clock className="h-5 w-5 text-ponto-entrada" />
            <div>
              <p className="text-2xl font-bold tabular-nums text-primary">{metrics.retDias} dias</p>
              <p className="text-xs text-muted-foreground">Tempo médio até cancelamento</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Janela</th>
                  <th className="pb-2 pr-3 font-medium">Base</th>
                  <th className="pb-2 pr-3 font-medium">Ativos</th>
                  <th className="pb-2 font-medium">Retenção</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cohort.map((c) => (
                  <tr key={c.janela}>
                    <td className="py-2 pr-3">{c.janela} dias</td>
                    <td className="py-2 pr-3 tabular-nums">{c.base}</td>
                    <td className="py-2 pr-3 tabular-nums">{c.ativos}</td>
                    <td className="py-2 font-semibold tabular-nums text-ponto-entrada">{c.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Transações no período"
        action={
          <Button size="sm" variant="outline" onClick={exportar} className="gap-1.5" disabled={transacoes.length === 0}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        }
      >
        {transacoes.length === 0 ? (
          <EmptyState title="Sem transações no período" description="Nenhuma movimentação de plano encontrada." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Usuário</th>
                  <th className="pb-2 pr-3 font-medium">Plano</th>
                  <th className="pb-2 pr-3 font-medium">Valor</th>
                  <th className="pb-2 pr-3 font-medium">Tipo</th>
                  <th className="pb-2 pr-3 font-medium">Data</th>
                  <th className="pb-2 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transacoes.map((t) => (
                  <tr key={t.id}>
                    <td className="max-w-[160px] truncate py-2 pr-3">{nomePorId.get(t.user_id) ?? "—"}</td>
                    <td className="py-2 pr-3">{planoUsuarioLabel(t.plano)}</td>
                    <td className="py-2 pr-3 tabular-nums">{fmtMoeda(t.valor)}</td>
                    <td className="py-2 pr-3">{t.tipo}</td>
                    <td className="py-2 pr-3 tabular-nums">{new Date(t.data).toLocaleDateString("pt-BR")}</td>
                    <td className="max-w-[160px] truncate py-2">{t.motivo}</td>
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

