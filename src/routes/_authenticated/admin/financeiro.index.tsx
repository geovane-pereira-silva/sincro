import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  UserPlus,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  EmptyState,
  MetricsGridSkeleton,
  CardSkeleton,
} from "@/components/admin-ui";
import { useUserPlans } from "@/hooks/use-financeiro";
import { PlanFilter, usePlanFilter } from "@/components/plan-filter";
import { useAdminProfiles, useAdminRegistros } from "@/hooks/use-admin";
import {
  calcularMrr,
  contarPorPlano,
  churnRecente,
  novosPagantes,
  serieMrr,
  diasDeUso,
  fmtMoeda,
  planoUsuarioLabel,
  PLANO_USUARIO_LABEL,
} from "@/lib/financeiro";
import { cn } from "@/lib/utils";
import { useAssinaturasAdmin } from "@/hooks/use-assinatura";
import { cancelarAssinaturaAdmin } from "@/lib/assinaturas.functions";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { mensagemErro } from "@/lib/erros";
import {
  STATUS_ASSINATURA_LABEL,
  STATUS_ASSINATURA_CLASSE,
  fmtDataBR,
  planoUsuarioLabel as planoPagoLabel,
  type StatusAssinatura,
} from "@/lib/asaas";

export const Route = createFileRoute("/_authenticated/admin/financeiro/")({
  head: () => ({ meta: [{ title: "Financeiro / CRM — SINCRO Admin" }] }),
  component: FinanceiroPage,
});

function MetricCard({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof DollarSign;
  value: string | number;
  label: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-card">
      <Icon
        className={cn(
          "h-6 w-6",
          tone === "down" ? "text-ponto-saida" : "text-ponto-entrada",
        )}
        strokeWidth={2}
      />
      <p className="mt-3 text-3xl font-bold tabular-nums text-primary">
        {value}
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">{label}</p>
    </div>
  );
}

function FunilEtapa({
  label,
  valor,
  pctAnterior,
}: {
  label: string;
  valor: number;
  pctAnterior: number | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
      <div className="flex-1">
        <p className="text-2xl font-bold tabular-nums text-primary">{valor}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      {pctAnterior != null && (
        <span className="shrink-0 rounded-full bg-ponto-entrada/15 px-2.5 py-1 text-xs font-bold text-ponto-entrada">
          {pctAnterior}%
        </span>
      )}
    </div>
  );
}

function FinanceiroPage() {
  const { data: planosAll = [], isLoading: lp } = useUserPlans();
  const { data: profiles = [], isLoading: lpr } = useAdminProfiles();
  const { data: regs = [], isLoading: lr } = useAdminRegistros(3650);
  const { plano: planoFiltro, setPlano } = usePlanFilter();

  const planos = useMemo(
    () => (planoFiltro === "todos" ? planosAll : planosAll.filter((p) => p.plano === planoFiltro)),
    [planosAll, planoFiltro],
  );

  const loading = lp || lpr || lr;


  const nomePorId = useMemo(
    () => new Map(profiles.map((p) => [p.id, p.nome_completo || p.email])),
    [profiles],
  );

  const mrr = useMemo(() => calcularMrr(planos), [planos]);
  const porPlano = useMemo(() => contarPorPlano(planos), [planos]);
  const churn = useMemo(() => churnRecente(planos, 30), [planos]);
  const novos = useMemo(() => novosPagantes(planos, 30), [planos]);
  const serie = useMemo(() => serieMrr(planos, 6), [planos]);

  const upgrades = useMemo(
    () =>
      planos
        .filter((p) => p.plano !== "free" && p.data_inicio)
        .sort(
          (a, b) =>
            new Date(b.data_inicio!).getTime() -
            new Date(a.data_inicio!).getTime(),
        )
        .slice(0, 30),
    [planos],
  );

  const funil = useMemo(() => {
    const total = profiles.length;
    const onboarding = profiles.filter((p) => p.onboarding_concluido).length;
    const comBatida = new Set(regs.map((r) => r.user_id)).size;
    // 7+ dias distintos com registro
    const diasPorUser = new Map<string, Set<string>>();
    for (const r of regs) {
      const k = r.data_hora.slice(0, 10);
      (diasPorUser.get(r.user_id) ?? diasPorUser.set(r.user_id, new Set()).get(r.user_id)!).add(k);
    }
    let sete = 0;
    for (const [, set] of diasPorUser) if (set.size >= 7) sete++;
    const pagos = planos.filter((p) => p.plano !== "free").length;
    return { total, onboarding, comBatida, sete, pagos };
  }, [profiles, regs, planos]);

  const pct = (a: number, b: number) =>
    b > 0 ? Math.round((a / b) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Financeiro / CRM</h1>
          <p className="text-sm text-muted-foreground">
            Receita, churn e conversão do SINCRO
          </p>
        </div>
        <PlanFilter value={planoFiltro} onChange={setPlano} />
      </div>


      {loading ? (
        <MetricsGridSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            icon={DollarSign}
            value={fmtMoeda(mrr)}
            label="MRR (receita recorrente)"
          />
          <div className="rounded-2xl bg-card p-5 shadow-card">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Usuários por plano
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(PLANO_USUARIO_LABEL).map(([v, l]) => (
                <span
                  key={v}
                  className="rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-foreground"
                >
                  {l}: {porPlano[v] ?? 0}
                </span>
              ))}
            </div>
          </div>
          <MetricCard
            icon={TrendingDown}
            value={churn.length}
            label="Churn (30 dias)"
            tone="down"
          />
          <MetricCard
            icon={UserPlus}
            value={novos.length}
            label="Novos pagantes (30 dias)"
          />
        </div>
      )}

      {/* Gráfico MRR */}
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <h2 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <TrendingUp className="h-4 w-4" /> MRR — últimos 6 meses
        </h2>
        {loading ? (
          <CardSkeleton />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmtMoeda(v)} />
                <Line
                  type="monotone"
                  dataKey="mrr"
                  stroke="hsl(var(--ponto-entrada))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Funil de conversão */}
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Funil de conversão
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <FunilEtapa label="Cadastrados" valor={funil.total} pctAnterior={null} />
          <FunilEtapa
            label="Onboarding"
            valor={funil.onboarding}
            pctAnterior={pct(funil.onboarding, funil.total)}
          />
          <FunilEtapa
            label="1ª batida"
            valor={funil.comBatida}
            pctAnterior={pct(funil.comBatida, funil.onboarding)}
          />
          <FunilEtapa
            label="7+ dias"
            valor={funil.sete}
            pctAnterior={pct(funil.sete, funil.comBatida)}
          />
          <FunilEtapa
            label="Converteram"
            valor={funil.pagos}
            pctAnterior={pct(funil.pagos, funil.sete)}
          />
        </div>
      </div>

      {/* Tabela de churn */}
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Cancelamentos (30 dias)
        </h2>
        {churn.length === 0 ? (
          <EmptyState
            title="Sem cancelamentos"
            description="Nenhum plano foi cancelado nos últimos 30 dias."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Usuário</th>
                  <th className="pb-2 pr-3 font-medium">Plano</th>
                  <th className="pb-2 pr-3 font-medium">Cancelou em</th>
                  <th className="pb-2 pr-3 font-medium">Motivo</th>
                  <th className="pb-2 font-medium">Dias de uso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {churn.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-3">{nomePorId.get(p.user_id) ?? "—"}</td>
                    <td className="py-2 pr-3">{planoUsuarioLabel(p.plano)}</td>
                    <td className="py-2 pr-3">
                      {p.cancelado_em
                        ? new Date(p.cancelado_em).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td className="py-2 pr-3">{p.motivo_cancelamento || "—"}</td>
                    <td className="py-2 tabular-nums">{diasDeUso(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tabela de upgrades */}
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Assinaturas pagas
        </h2>
        {upgrades.length === 0 ? (
          <EmptyState
            title="Nenhuma assinatura paga"
            description="Ainda não há planos pagos registrados."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Usuário</th>
                  <th className="pb-2 pr-3 font-medium">Plano</th>
                  <th className="pb-2 pr-3 font-medium">Início</th>
                  <th className="pb-2 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {upgrades.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-3">{nomePorId.get(p.user_id) ?? "—"}</td>
                    <td className="py-2 pr-3">{planoUsuarioLabel(p.plano)}</td>
                    <td className="py-2 pr-3">
                      {p.data_inicio
                        ? new Date(p.data_inicio).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td className="py-2 tabular-nums">
                      {fmtMoeda(Number(p.valor_cobrado) || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
