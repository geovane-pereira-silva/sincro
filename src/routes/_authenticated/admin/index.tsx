import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  Activity,
  Clock,
  Share2,
  Building2,
  UsersRound,
  Flame,
  TimerReset,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  useAdminProfiles,
  useActivePremium,
  useAdminRegistros,
} from "@/hooks/use-admin";
import { useEmpresas, useColaboradoresCount } from "@/hooks/use-empresas";
import { useUserPlans } from "@/hooks/use-financeiro";
import { useConcederPremiumLote } from "@/hooks/use-admin-actions";
import { premiumMap, formatDataCurta, diasRestantes } from "@/lib/admin";
import { planoEmpresaLabel } from "@/lib/empresas";
import { dayKeyInTz } from "@/lib/ponto";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  MetricsGridSkeleton,
  ListRowsSkeleton,
  InitialsAvatar,
  PremiumBadge,
} from "@/components/admin-ui";


export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

const TZ_REF = "America/Sao_Paulo";

function MetricCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-card transition-shadow hover:shadow-soft">
      <Icon className="h-6 w-6 text-ponto-entrada" strokeWidth={2} />
      <p className="mt-3 text-4xl font-bold tabular-nums text-primary">
        {value}
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">{label}</p>
    </div>
  );
}

function AdminDashboard() {
  const { data: profiles = [], isLoading: lp } = useAdminProfiles();
  const { data: premium = [], isLoading: lpr } = useActivePremium();
  const { data: regs7 = [], isLoading: lr } = useAdminRegistros(7);
  
  const { data: empresas = [] } = useEmpresas();
  const { data: colabCount = {} } = useColaboradoresCount();
  const { data: planos = [] } = useUserPlans();
  const concederPremium = useConcederPremiumLote();

  const pmap = useMemo(() => premiumMap(premium), [premium]);

  const nomePorId = useMemo(
    () => new Map(profiles.map((p) => [p.id, p.nome_completo || p.email])),
    [profiles],
  );

  // Top 5 usuários mais ativos esta semana (batidas nos últimos 7 dias)
  const topAtivos = useMemo(() => {
    const cont = new Map<string, number>();
    for (const r of regs7) cont.set(r.user_id, (cont.get(r.user_id) ?? 0) + 1);
    return Array.from(cont.entries())
      .map(([id, batidas]) => ({ id, batidas, nome: nomePorId.get(id) ?? "—" }))
      .sort((a, b) => b.batidas - a.batidas)
      .slice(0, 5);
  }, [regs7, nomePorId]);

  // Próximos 5 premium a expirar
  const proximosExpirar = useMemo(() => {
    return Array.from(pmap.values())
      .map((p) => ({
        user_id: p.user_id,
        valido_ate: p.valido_ate,
        dias: diasRestantes(p.valido_ate),
        nome: nomePorId.get(p.user_id) ?? "—",
      }))
      .filter((p) => p.dias >= 0)
      .sort((a, b) => a.dias - b.dias)
      .slice(0, 5);
  }, [pmap, nomePorId]);

  // Churn esta semana vs semana anterior
  const churnSemana = useMemo(() => {
    const agora = Date.now();
    const DIA = 24 * 3600 * 1000;
    let atual = 0;
    let anterior = 0;
    for (const p of planos) {
      if (!p.cancelado_em) continue;
      const t = new Date(p.cancelado_em).getTime();
      const diff = agora - t;
      if (diff <= 7 * DIA) atual++;
      else if (diff <= 14 * DIA) anterior++;
    }
    const pct =
      anterior > 0
        ? Math.round(((atual - anterior) / anterior) * 100)
        : atual > 0
          ? 100
          : 0;
    return { atual, anterior, pct };
  }, [planos]);


  const metrics = useMemo(() => {
    const total = profiles.length;
    const ativos = new Set(regs7.map((r) => r.user_id)).size;
    const hojeKey = dayKeyInTz(new Date(), TZ_REF);
    const batidasHoje = regs7.filter(
      (r) => dayKeyInTz(new Date(r.data_hora), TZ_REF) === hojeKey,
    ).length;
    const indicacoes = profiles.reduce(
      (acc, p) => acc + (p.referral_count ?? 0),
      0,
    );
    return { total, ativos, batidasHoje, indicacoes };
  }, [profiles, regs7]);

  const recentes = useMemo(() => profiles.slice(0, 5), [profiles]);
  const loading = lp || lpr || lr;

  const empresasStats = useMemo(() => {
    const ativas = empresas.filter((e) => e.ativo).length;
    const totalColab = Object.values(colabCount).reduce((a, b) => a + b, 0);
    let topNome = "—";
    let topQtd = 0;
    for (const e of empresas) {
      const q = colabCount[e.id] ?? 0;
      if (q > topQtd) {
        topQtd = q;
        topNome = e.nome;
      }
    }
    const porPlano = new Map<string, number>();
    for (const e of empresas)
      porPlano.set(e.plano, (porPlano.get(e.plano) ?? 0) + 1);
    const pie = Array.from(porPlano.entries()).map(([plano, value]) => ({
      name: planoEmpresaLabel(plano),
      value,
    }));
    return { ativas, totalColab, topNome, topQtd, pie };
  }, [empresas, colabCount]);

  const PIE_CORES = [
    "hsl(var(--ponto-entrada))",
    "hsl(var(--ponto-saida-intervalo))",
    "hsl(var(--ponto-entrada-intervalo))",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do SINCRO</p>
      </div>

      {loading ? (
        <MetricsGridSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            icon={Users}
            value={metrics.total}
            label="Usuários cadastrados"
          />
          <MetricCard
            icon={Activity}
            value={metrics.ativos}
            label="Ativos (7 dias)"
          />
          <MetricCard
            icon={Clock}
            value={metrics.batidasHoje}
            label="Batidas hoje"
          />
          <MetricCard
            icon={Share2}
            value={metrics.indicacoes}
            label="Indicações realizadas"
          />
        </div>
      )}

      {/* Seção Empresas */}
      <div className="rounded-2xl bg-card p-5 shadow-card md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Empresas
          </h2>
          <Link
            to="/admin/empresas"
            className="text-xs font-semibold text-ponto-entrada hover:underline"
          >
            Ver todas
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-muted/40 p-4">
            <Building2 className="h-5 w-5 text-ponto-entrada" />
            <p className="mt-2 text-2xl font-bold tabular-nums text-primary">
              {empresasStats.ativas}
            </p>
            <p className="text-xs text-muted-foreground">Empresas ativas</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-4">
            <UsersRound className="h-5 w-5 text-ponto-entrada" />
            <p className="mt-2 text-2xl font-bold tabular-nums text-primary">
              {empresasStats.totalColab}
            </p>
            <p className="text-xs text-muted-foreground">Colaboradores</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-4">
            <p className="truncate text-lg font-bold text-primary">
              {empresasStats.topNome}
            </p>
            <p className="text-xs text-muted-foreground">
              Maior empresa ({empresasStats.topQtd})
            </p>
          </div>
          <div className="rounded-xl bg-muted/40 p-4">
            <p className="mb-1 text-xs text-muted-foreground">Por plano</p>
            {empresasStats.pie.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados</p>
            ) : (
              <div className="h-20 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={empresasStats.pie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={20}
                      outerRadius={36}
                    >
                      {empresasStats.pie.map((_, i) => (
                        <Cell key={i} fill={PIE_CORES[i % PIE_CORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Widgets de relatório rápido */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top 5 ativos */}
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Flame className="h-4 w-4 text-ponto-entrada" /> Top 5 ativos (semana)
          </h2>
          {loading ? (
            <ListRowsSkeleton rows={5} />
          ) : topAtivos.length === 0 ? (
            <EmptyState title="Sem atividade esta semana" />
          ) : (
            <ul className="divide-y divide-border">
              {topAtivos.map((u, i) => (
                <li key={u.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-4 shrink-0 text-center text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <Link
                    to="/admin/usuarios/$id"
                    params={{ id: u.id }}
                    className="min-w-0 flex-1 truncate text-sm font-semibold text-primary hover:underline"
                  >
                    {u.nome}
                  </Link>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-ponto-entrada">
                    {u.batidas}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Próximos a expirar */}
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <TimerReset className="h-4 w-4 text-ponto-entrada" /> Premium a expirar
          </h2>
          {loading ? (
            <ListRowsSkeleton rows={5} />
          ) : proximosExpirar.length === 0 ? (
            <EmptyState title="Nenhum premium ativo" />
          ) : (
            <ul className="divide-y divide-border">
              {proximosExpirar.map((u) => (
                <li key={u.user_id} className="flex items-center gap-2 py-2.5">
                  <Link
                    to="/admin/usuarios/$id"
                    params={{ id: u.user_id }}
                    className="min-w-0 flex-1 truncate text-sm font-semibold text-primary hover:underline"
                  >
                    {u.nome}
                  </Link>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                    {u.dias}d
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2 text-xs"
                    disabled={concederPremium.isPending}
                    onClick={() =>
                      concederPremium.mutate({
                        userIds: [u.user_id],
                        dias: 30,
                        motivo: "admin_manual",
                      })
                    }
                  >
                    <RefreshCw className="h-3 w-3" /> Renovar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Churn esta semana */}
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <TrendingDown className="h-4 w-4 text-ponto-saida" /> Churn esta semana
          </h2>
          <p className="text-4xl font-bold tabular-nums text-primary">
            {churnSemana.atual}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            cancelamentos nos últimos 7 dias
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-sm">
            <span
              className={
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold " +
                (churnSemana.pct > 0
                  ? "bg-ponto-saida/15 text-ponto-saida"
                  : "bg-ponto-entrada/15 text-ponto-entrada")
              }
            >
              {churnSemana.pct > 0 ? "▲" : churnSemana.pct < 0 ? "▼" : "="}{" "}
              {Math.abs(churnSemana.pct)}%
            </span>
            <span className="text-xs text-muted-foreground">
              vs. semana anterior ({churnSemana.anterior})
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-card md:p-6">

        <h2 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Usuários recentes
        </h2>

        {loading ? (
          <ListRowsSkeleton rows={5} />
        ) : recentes.length === 0 ? (
          <EmptyState
            title="Nenhum registro ainda"
            description="Assim que novos usuários se cadastrarem, eles aparecerão aqui."
          />
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {recentes.map((p) => {
              const prem = pmap.get(p.id);
              return (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <InitialsAvatar
                    name={p.nome_completo}
                    email={p.email}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/admin/usuarios/$id"
                      params={{ id: p.id }}
                      className="block truncate text-sm font-semibold text-primary hover:underline"
                    >
                      {p.nome_completo || "Sem nome"}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.email}
                    </p>
                  </div>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                    {formatDataCurta(p.created_at)}
                  </span>
                  <PremiumBadge validoAte={prem?.valido_ate} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
