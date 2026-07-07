import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RelatorioFiltros } from "@/components/relatorio-filtros";
import { RelatorioUsuarios } from "@/components/relatorios/relatorio-usuarios";
import { RelatorioFinanceiro } from "@/components/relatorios/relatorio-financeiro";
import { RelatorioEmpresas } from "@/components/relatorios/relatorio-empresas";
import { RelatorioGamificacao } from "@/components/relatorios/relatorio-gamificacao";
import { useRelatorioFiltros } from "@/hooks/use-relatorio-filtros";
import {
  useAdminProfiles,
  useAllPremium,
  useAllBatidas,
} from "@/hooks/use-admin";
import { useUserPlans, usePlanoPorUsuario } from "@/hooks/use-financeiro";
import {
  useEmpresas,
  useColaboradoresAtivosCount,
  useSetoresCount,
  useJornadasCount,
} from "@/hooks/use-empresas";
import { computeStreaks, formatDataCurta, motivoPremiumLabel } from "@/lib/admin";
import { planoUsuarioLabel, fmtMoeda, isPago } from "@/lib/financeiro";
import { planoEmpresaLabel, fmtDataBr } from "@/lib/empresas";
import {
  agregarBatidas,
  filtrarPerfis,
  montarCsv,
  baixarZipCsvs,
  dentroDoPeriodo,
  toDateInput,
  type FiltrosRelatorio,
} from "@/lib/relatorios";

export const Route = createFileRoute("/_authenticated/admin/relatorios/")({
  head: () => ({ meta: [{ title: "Relatórios gerenciais — SINCRO Admin" }] }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { filtros, persist, limpar } = useRelatorioFiltros();
  const [draft, setDraft] = useState<FiltrosRelatorio>(filtros);

  // Mantém o draft espelhando os filtros aplicados (hidratação, limpar, aplicar).
  useEffect(() => {
    setDraft(filtros);
  }, [filtros]);


  const { data: empresas = [] } = useEmpresas();

  // Dados para exportação consolidada
  const { data: profiles = [] } = useAdminProfiles();
  const { data: premium = [] } = useAllPremium();
  const { data: batidas = [] } = useAllBatidas();
  const { data: planos = [] } = useUserPlans();
  const { data: planoPorUsuario = {} } = usePlanoPorUsuario();
  const { data: colabCount = {} } = useColaboradoresAtivosCount();
  const { data: setoresCount = {} } = useSetoresCount();
  const { data: jornadasCount = {} } = useJornadasCount();

  const batidasAgg = useMemo(() => agregarBatidas(batidas), [batidas]);
  const streaks = useMemo(() => {
    const tz: Record<string, string> = {};
    for (const p of profiles) tz[p.id] = p.timezone;
    return computeStreaks(batidas, tz);
  }, [profiles, batidas]);

  function aplicar() {
    persist(draft);
  }

  function onLimpar() {
    limpar();
  }


  async function exportarTudo() {
    const nomePorId = new Map(profiles.map((p) => [p.id, p.nome_completo || p.email]));

    // usuarios.csv
    const perfisFiltrados = filtrarPerfis(profiles, {
      filtros,
      planoPorUsuario,
      batidasAgg,
    });
    const usuariosCsv = montarCsv(
      ["Nome", "Email", "Cadastro", "Plano", "Batidas", "Último acesso", "Streak", "Origem"],
      perfisFiltrados.map((p) => {
        const ag = batidasAgg.get(p.id);
        return [
          p.nome_completo || "",
          p.email,
          formatDataCurta(p.created_at),
          planoUsuarioLabel(planoPorUsuario[p.id] ?? "free"),
          ag?.total ?? 0,
          ag?.ultima ? formatDataCurta(ag.ultima) : "—",
          streaks[p.id] ?? 0,
          p.referred_by ? "Indicado" : "Direto",
        ];
      }),
    );

    // financeiro.csv
    const planosF =
      filtros.plano === "todos" ? planos : planos.filter((p) => p.plano === filtros.plano);
    const financeiroRows: (string | number)[][] = [];
    for (const p of planosF) {
      if (dentroDoPeriodo(p.cancelado_em, filtros.inicio, filtros.fim)) {
        financeiroRows.push([
          nomePorId.get(p.user_id) ?? "—",
          planoUsuarioLabel(p.plano),
          fmtMoeda((Number(p.valor_cobrado) || 0) / (p.plano === "premium_anual" ? 12 : 1)),
          "Cancelamento",
          new Date(p.cancelado_em!).toLocaleDateString("pt-BR"),
          p.motivo_cancelamento || "—",
        ]);
      }
      if (isPago(p.plano) && dentroDoPeriodo(p.data_inicio, filtros.inicio, filtros.fim)) {
        financeiroRows.push([
          nomePorId.get(p.user_id) ?? "—",
          planoUsuarioLabel(p.plano),
          fmtMoeda((Number(p.valor_cobrado) || 0) / (p.plano === "premium_anual" ? 12 : 1)),
          "Upgrade",
          new Date(p.data_inicio!).toLocaleDateString("pt-BR"),
          "—",
        ]);
      }
    }
    const financeiroCsv = montarCsv(
      ["Usuário", "Plano", "Valor mensal", "Tipo", "Data", "Motivo"],
      financeiroRows,
    );

    // gamificacao.csv
    const premiumPeriodo = premium.filter((p) =>
      dentroDoPeriodo(p.created_at, filtros.inicio, filtros.fim),
    );
    const gamificacaoCsv = montarCsv(
      ["Usuário", "Motivo", "Dias", "Concedido em", "Expira em", "Status"],
      premiumPeriodo.map((pr) => {
        const dias = Math.max(
          0,
          Math.round(
            (new Date(pr.valido_ate).getTime() - new Date(pr.created_at).getTime()) /
              (24 * 3600 * 1000),
          ),
        );
        return [
          nomePorId.get(pr.user_id) ?? "—",
          motivoPremiumLabel(pr.motivo),
          dias,
          formatDataCurta(pr.created_at),
          formatDataCurta(pr.valido_ate),
          new Date(pr.valido_ate).getTime() > Date.now() ? "Ativo" : "Expirado",
        ];
      }),
    );

    const arquivos = [
      { nome: "usuarios.csv", conteudo: usuariosCsv },
      { nome: "financeiro.csv", conteudo: financeiroCsv },
      { nome: "gamificacao.csv", conteudo: gamificacaoCsv },
    ];

    // empresas.csv (se houver)
    if (empresas.length > 0) {
      const empresasCsv = montarCsv(
        ["Empresa", "Plano", "Colaboradores", "Máximo", "Setores", "Jornadas", "Criada em", "Status"],
        empresas.map((e) => [
          e.nome,
          planoEmpresaLabel(e.plano),
          colabCount[e.id] ?? 0,
          e.max_colaboradores,
          setoresCount[e.id] ?? 0,
          jornadasCount[e.id] ?? 0,
          fmtDataBr(e.created_at),
          e.ativo ? "Ativa" : "Inativa",
        ]),
      );
      arquivos.push({ nome: "empresas.csv", conteudo: empresasCsv });
    }

    await baixarZipCsvs(`sincro-relatorio-${toDateInput(new Date())}.zip`, arquivos);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Relatórios gerenciais</h1>
          <p className="text-sm text-muted-foreground">
            Engajamento, financeiro, empresas e referral
          </p>
        </div>
        <Button onClick={exportarTudo} className="gap-2">
          <FileDown className="h-4 w-4" /> Exportar relatório completo
        </Button>
      </div>

      <RelatorioFiltros
        draft={draft}
        setDraft={setDraft}
        empresas={empresas}
        onAplicar={aplicar}
        onLimpar={onLimpar}
      />

      <Tabs defaultValue="usuarios">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          {empresas.length > 0 && <TabsTrigger value="empresas">Empresas</TabsTrigger>}
          <TabsTrigger value="gamificacao">Gamificação</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-6">
          <RelatorioUsuarios filtros={filtros} />
        </TabsContent>
        <TabsContent value="financeiro" className="mt-6">
          <RelatorioFinanceiro filtros={filtros} />
        </TabsContent>
        {empresas.length > 0 && (
          <TabsContent value="empresas" className="mt-6">
            <RelatorioEmpresas />
          </TabsContent>
        )}
        <TabsContent value="gamificacao" className="mt-6">
          <RelatorioGamificacao filtros={filtros} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
