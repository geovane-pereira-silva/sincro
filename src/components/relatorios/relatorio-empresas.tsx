import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Building2, UsersRound, Gauge, AlertTriangle, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, MetricsGridSkeleton, ListRowsSkeleton } from "@/components/admin-ui";
import { MetricCard, SectionCard, SortHeader } from "@/components/relatorios/shared";
import {
  useEmpresas,
  useColaboradoresAtivosCount,
  useSetoresCount,
  useJornadasCount,
} from "@/hooks/use-empresas";
import { baixarCsv } from "@/lib/admin";
import {
  planoEmpresaLabel,
  fmtDataBr,
  PLANO_EMPRESA_LABEL,
  type PlanoEmpresa,
} from "@/lib/empresas";

type Col = "nome" | "plano" | "colab" | "setores" | "jornadas" | "criada" | "status";

export function RelatorioEmpresas() {
  const { data: empresas = [], isLoading: le } = useEmpresas();
  const { data: colabCount = {} } = useColaboradoresAtivosCount();
  const { data: setoresCount = {} } = useSetoresCount();
  const { data: jornadasCount = {} } = useJornadasCount();

  const [fPlano, setFPlano] = useState("todos");
  const [fStatus, setFStatus] = useState("todos");
  const [ordem, setOrdem] = useState<{ col: Col; dir: "asc" | "desc" }>({
    col: "criada",
    dir: "desc",
  });

  const cards = useMemo(() => {
    const ativas = empresas.filter((e) => e.ativo);
    const porPlano: Record<string, number> = { start: 0, flow: 0, nexus: 0 };
    for (const e of ativas) porPlano[e.plano] = (porPlano[e.plano] ?? 0) + 1;
    const totalColab = Object.values(colabCount).reduce((a, b) => a + b, 0);
    const media = ativas.length > 0 ? +(totalColab / ativas.length).toFixed(1) : 0;
    const noLimite = empresas.filter((e) => {
      const usados = colabCount[e.id] ?? 0;
      return e.max_colaboradores > 0 && usados / e.max_colaboradores >= 0.8;
    }).length;
    return { porPlano, totalColab, media, noLimite };
  }, [empresas, colabCount]);

  const linhas = useMemo(() => {
    let arr = empresas.map((e) => ({
      e,
      colab: colabCount[e.id] ?? 0,
      setores: setoresCount[e.id] ?? 0,
      jornadas: jornadasCount[e.id] ?? 0,
    }));
    if (fPlano !== "todos") arr = arr.filter((x) => x.e.plano === fPlano);
    if (fStatus !== "todos")
      arr = arr.filter((x) => (fStatus === "ativos" ? x.e.ativo : !x.e.ativo));
    const dir = ordem.dir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (ordem.col) {
        case "nome":
          return dir * a.e.nome.localeCompare(b.e.nome);
        case "plano":
          return dir * a.e.plano.localeCompare(b.e.plano);
        case "colab":
          return dir * (a.colab - b.colab);
        case "setores":
          return dir * (a.setores - b.setores);
        case "jornadas":
          return dir * (a.jornadas - b.jornadas);
        case "status":
          return dir * (Number(a.e.ativo) - Number(b.e.ativo));
        default:
          return dir * (new Date(a.e.created_at).getTime() - new Date(b.e.created_at).getTime());
      }
    });
    return arr;
  }, [empresas, colabCount, setoresCount, jornadasCount, fPlano, fStatus, ordem]);

  function sort(col: Col) {
    setOrdem((o) => (o.col === col ? { col, dir: o.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" }));
  }

  function exportar() {
    const cab = ["Empresa", "Plano", "Colaboradores", "Máximo", "Setores", "Jornadas", "Criada em", "Status"];
    const rows = linhas.map((l) => [
      l.e.nome,
      planoEmpresaLabel(l.e.plano),
      l.colab,
      l.e.max_colaboradores,
      l.setores,
      l.jornadas,
      fmtDataBr(l.e.created_at),
      l.e.ativo ? "Ativa" : "Inativa",
    ]);
    baixarCsv("sincro-empresas.csv", cab, rows);
  }

  if (!le && empresas.length === 0) {
    return (
      <div className="rounded-2xl bg-card shadow-card">
        <EmptyState
          title="Nenhuma empresa cadastrada"
          description="Cadastre empresas no módulo corporativo para ver este relatório."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {le ? (
        <MetricsGridSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {(Object.keys(PLANO_EMPRESA_LABEL) as PlanoEmpresa[]).map((pl) => (
              <MetricCard
                key={pl}
                icon={Building2}
                value={cards.porPlano[pl] ?? 0}
                label={`Ativas — ${PLANO_EMPRESA_LABEL[pl]}`}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <MetricCard icon={UsersRound} value={cards.totalColab} label="Colaboradores ativos" />
            <MetricCard icon={Gauge} value={cards.media} label="Média por empresa" />
            <MetricCard icon={AlertTriangle} value={cards.noLimite} label="Próximas do limite (≥80%)" tone="down" />
          </div>
        </>
      )}

      <SectionCard
        title="Empresas"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={fPlano} onValueChange={setFPlano}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos planos</SelectItem>
                <SelectItem value="start">Start</SelectItem>
                <SelectItem value="flow">Flow</SelectItem>
                <SelectItem value="nexus">Nexus</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="ativos">Ativas</SelectItem>
                <SelectItem value="inativos">Inativas</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={exportar} className="gap-1.5" disabled={linhas.length === 0}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        }
      >
        {le ? (
          <ListRowsSkeleton rows={5} />
        ) : linhas.length === 0 ? (
          <EmptyState title="Nenhuma empresa encontrada" description="Ajuste os filtros de plano e status." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <SortHeader label="Empresa" col="nome" ordem={ordem} onSort={sort} />
                  <SortHeader label="Plano" col="plano" ordem={ordem} onSort={sort} />
                  <SortHeader label="Colab." col="colab" ordem={ordem} onSort={sort} />
                  <SortHeader label="Setores" col="setores" ordem={ordem} onSort={sort} />
                  <SortHeader label="Jornadas" col="jornadas" ordem={ordem} onSort={sort} />
                  <th className="pb-2 pr-3 font-medium">Batidas</th>
                  <SortHeader label="Criada" col="criada" ordem={ordem} onSort={sort} />
                  <SortHeader label="Status" col="status" ordem={ordem} onSort={sort} />
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {linhas.map((l) => {
                  const perto = l.e.max_colaboradores > 0 && l.colab / l.e.max_colaboradores >= 0.8;
                  return (
                    <tr key={l.e.id}>
                      <td className="max-w-[160px] truncate py-2 pr-3 font-medium text-foreground">{l.e.nome}</td>
                      <td className="py-2 pr-3">{planoEmpresaLabel(l.e.plano)}</td>
                      <td className={"py-2 pr-3 tabular-nums " + (perto ? "font-bold text-ponto-saida" : "")}>
                        {l.colab}/{l.e.max_colaboradores}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{l.setores}</td>
                      <td className="py-2 pr-3 tabular-nums">{l.jornadas}</td>
                      <td className="py-2 pr-3 tabular-nums text-muted-foreground">—</td>
                      <td className="py-2 pr-3 tabular-nums">{fmtDataBr(l.e.created_at)}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                            (l.e.ativo ? "bg-ponto-entrada/15 text-ponto-entrada" : "bg-muted text-muted-foreground")
                          }
                        >
                          {l.e.ativo ? "Ativa" : "Inativa"}
                        </span>
                      </td>
                      <td className="py-2">
                        <Link
                          to="/admin/empresas/$id"
                          params={{ id: l.e.id }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-ponto-entrada hover:underline"
                        >
                          Ver <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
