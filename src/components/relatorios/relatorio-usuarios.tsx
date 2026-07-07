import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users,
  UserPlus,
  Zap,
  Activity,
  BarChart3,
  Flame,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  MetricsGridSkeleton,
  ListRowsSkeleton,
} from "@/components/admin-ui";
import { MetricCard, SectionCard, SortHeader } from "@/components/relatorios/shared";
import {
  useAdminProfiles,
  useActivePremium,
  useAdminRegistros,
  useAllBatidas,
} from "@/hooks/use-admin";
import { usePlanoPorUsuario } from "@/hooks/use-financeiro";
import { premiumMap, computeStreaks, formatDataCurta, baixarCsv } from "@/lib/admin";
import { planoUsuarioLabel } from "@/lib/financeiro";
import {
  agregarBatidas,
  filtrarPerfis,
  calcularEngajamento,
  cadastrosPorDia,
  type FiltrosRelatorio,
} from "@/lib/relatorios";

const PAGE_SIZE = 25;

type Col = "nome" | "cadastro" | "plano" | "batidas" | "acesso" | "streak" | "origem";

export function RelatorioUsuarios({ filtros }: { filtros: FiltrosRelatorio }) {
  const { data: profiles = [], isLoading: lp } = useAdminProfiles();
  const { data: premium = [] } = useActivePremium();
  const { data: batidas = [], isLoading: lb } = useAllBatidas();
  const { data: regs = [] } = useAdminRegistros(45);
  const { data: planoPorUsuario = {} } = usePlanoPorUsuario();

  const [ordem, setOrdem] = useState<{ col: Col; dir: "asc" | "desc" }>({
    col: "cadastro",
    dir: "desc",
  });
  const [page, setPage] = useState(0);

  const batidasAgg = useMemo(() => agregarBatidas(batidas), [batidas]);
  const pmap = useMemo(() => premiumMap(premium), [premium]);
  const streaks = useMemo(() => {
    const tz: Record<string, string> = {};
    for (const p of profiles) tz[p.id] = p.timezone;
    return computeStreaks(regs, tz);
  }, [profiles, regs]);

  const filtrados = useMemo(
    () => filtrarPerfis(profiles, { filtros, planoPorUsuario, batidasAgg }),
    [profiles, filtros, planoPorUsuario, batidasAgg],
  );

  const metrics = useMemo(
    () => calcularEngajamento(filtrados, { filtros, batidasAgg, streaks }),
    [filtrados, filtros, batidasAgg, streaks],
  );

  const chart = useMemo(
    () => cadastrosPorDia(filtrados, filtros.inicio, filtros.fim),
    [filtrados, filtros],
  );

  const linhas = useMemo(() => {
    const arr = filtrados.map((p) => {
      const ag = batidasAgg.get(p.id);
      return {
        p,
        cadastro: new Date(p.created_at).getTime(),
        plano: planoPorUsuario[p.id] ?? "free",
        batidas: ag?.total ?? 0,
        acesso: ag?.ultima ? new Date(ag.ultima).getTime() : 0,
        streak: streaks[p.id] ?? 0,
        origem: p.referred_by ? "Indicado" : "Direto",
      };
    });
    const dir = ordem.dir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (ordem.col) {
        case "nome":
          return dir * (a.p.nome_completo || a.p.email).localeCompare(b.p.nome_completo || b.p.email);
        case "plano":
          return dir * a.plano.localeCompare(b.plano);
        case "batidas":
          return dir * (a.batidas - b.batidas);
        case "acesso":
          return dir * (a.acesso - b.acesso);
        case "streak":
          return dir * (a.streak - b.streak);
        case "origem":
          return dir * a.origem.localeCompare(b.origem);
        default:
          return dir * (a.cadastro - b.cadastro);
      }
    });
    return arr;
  }, [filtrados, batidasAgg, planoPorUsuario, streaks, ordem]);

  const totalPages = Math.max(1, Math.ceil(linhas.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);
  const pageRows = linhas.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  function sort(col: Col) {
    setOrdem((o) => (o.col === col ? { col, dir: o.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" }));
    setPage(0);
  }

  function exportar() {
    const cab = [
      "Nome",
      "Email",
      "Cadastro",
      "Plano",
      "Batidas totais",
      "Último acesso",
      "Streak atual",
      "Origem",
    ];
    const rows = linhas.map((l) => [
      l.p.nome_completo || "",
      l.p.email,
      formatDataCurta(l.p.created_at),
      planoUsuarioLabel(l.plano),
      l.batidas,
      l.acesso ? formatDataCurta(new Date(l.acesso).toISOString()) : "—",
      l.streak,
      l.origem,
    ]);
    baixarCsv("sincro-usuarios.csv", cab, rows);
  }

  const loading = lp || lb;

  return (
    <div className="space-y-6">
      {loading ? (
        <MetricsGridSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <MetricCard icon={Users} value={metrics.total} label="Total de usuários" />
          <MetricCard icon={UserPlus} value={metrics.novos} label="Novos cadastros (período)" />
          <MetricCard icon={Zap} value={`${metrics.taxaAtivacao}%`} label="Taxa de ativação" />
          <MetricCard icon={Activity} value={metrics.ativos7} label="Ativos (7 dias)" />
          <MetricCard icon={BarChart3} value={metrics.mediaBatidasAtivo} label="Média batidas/ativo" />
          <MetricCard icon={Flame} value={metrics.emStreak} label="Streak ≥ 7 dias" />
        </div>
      )}

      <SectionCard title="Novos cadastros no período">
        {loading ? (
          <div className="h-56" />
        ) : chart.every((c) => c.valor === 0) ? (
          <EmptyState title="Sem cadastros no período" description="Ajuste o período ou os filtros." />
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="valor" fill="hsl(var(--ponto-entrada))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Detalhamento de usuários"
        action={
          <Button size="sm" variant="outline" onClick={exportar} className="gap-1.5" disabled={linhas.length === 0}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        }
      >
        {loading ? (
          <ListRowsSkeleton rows={6} />
        ) : linhas.length === 0 ? (
          <EmptyState title="Nenhum usuário encontrado" description="Nenhum usuário corresponde aos filtros selecionados." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <SortHeader label="Usuário" col="nome" ordem={ordem} onSort={sort} />
                    <SortHeader label="Cadastro" col="cadastro" ordem={ordem} onSort={sort} />
                    <SortHeader label="Plano" col="plano" ordem={ordem} onSort={sort} />
                    <SortHeader label="Batidas" col="batidas" ordem={ordem} onSort={sort} />
                    <SortHeader label="Último acesso" col="acesso" ordem={ordem} onSort={sort} />
                    <SortHeader label="Streak" col="streak" ordem={ordem} onSort={sort} />
                    <SortHeader label="Origem" col="origem" ordem={ordem} onSort={sort} />
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageRows.map((l) => (
                    <tr key={l.p.id}>
                      <td className="max-w-[180px] py-2 pr-3">
                        <span className="block truncate font-medium text-foreground">
                          {l.p.nome_completo || "Sem nome"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{l.p.email}</span>
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{formatDataCurta(l.p.created_at)}</td>
                      <td className="py-2 pr-3">{planoUsuarioLabel(l.plano)}</td>
                      <td className="py-2 pr-3 tabular-nums">{l.batidas}</td>
                      <td className="py-2 pr-3 tabular-nums">
                        {l.acesso ? formatDataCurta(new Date(l.acesso).toISOString()) : "—"}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{l.streak}</td>
                      <td className="py-2 pr-3">{l.origem}</td>
                      <td className="py-2">
                        <Link
                          to="/admin/usuarios/$id"
                          params={{ id: l.p.id }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-ponto-entrada hover:underline"
                        >
                          Ver <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {pageSafe * PAGE_SIZE + 1}–{Math.min((pageSafe + 1) * PAGE_SIZE, linhas.length)} de {linhas.length}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    disabled={pageSafe === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    disabled={pageSafe >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
