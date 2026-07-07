import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Activity, Clock, Share2, Building2, UsersRound } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  useAdminProfiles,
  useActivePremium,
  useAdminRegistros,
} from "@/hooks/use-admin";
import { useEmpresas, useColaboradoresCount } from "@/hooks/use-empresas";
import { premiumMap, formatDataCurta } from "@/lib/admin";
import { planoEmpresaLabel } from "@/lib/empresas";
import { dayKeyInTz } from "@/lib/ponto";
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

  const pmap = useMemo(() => premiumMap(premium), [premium]);

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
