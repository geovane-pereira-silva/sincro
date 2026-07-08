import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { History, Search, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardSkeleton, EmptyState } from "@/components/admin-ui";
import { useAuditoria, type AuditoriaRow } from "@/hooks/use-exportar-pontos";
import { useAdminProfiles } from "@/hooks/use-admin";
import { montarCsv, baixarCsv } from "@/lib/relatorios";
import { baixarPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/_authenticated/admin/auditoria/")({
  head: () => ({ meta: [{ title: "Auditoria — SINCRO Admin" }] }),
  component: AuditoriaPage,
});

const ACAO_LABEL: Record<string, string> = {
  conceder_admin: "Administrador concedido",
  revogar_admin: "Administrador revogado",
  criar_gestor_empresa: "Gestor criado",
  resetar_senha_gestor: "Senha do gestor redefinida",
  excluir_empresa: "Empresa excluída",
  excluir_setor: "Setor excluído",
  excluir_colaborador: "Colaborador excluído",
  excluir_jornada: "Jornada excluída",
  desativar_colaborador: "Colaborador desativado",
  reativar_colaborador: "Colaborador reativado",
};

function acaoLabel(a: string): string {
  return ACAO_LABEL[a] ?? a.replace(/_/g, " ");
}

function fmtDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function AuditoriaPage() {
  const { data: rows, isLoading } = useAuditoria();
  const { data: perfis } = useAdminProfiles();
  const [busca, setBusca] = useState("");
  const [acao, setAcao] = useState("todas");

  const nomePorId = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of perfis ?? []) m.set(p.id, p.nome_completo ?? p.email);
    return m;
  }, [perfis]);

  const acoes = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows ?? []) s.add(r.acao);
    return Array.from(s).sort();
  }, [rows]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (acao !== "todas" && r.acao !== acao) return false;
      if (!q) return true;
      const admin = (nomePorId.get(r.admin_id) ?? "").toLowerCase();
      return (
        admin.includes(q) ||
        acaoLabel(r.acao).toLowerCase().includes(q) ||
        (r.motivo ?? "").toLowerCase().includes(q) ||
        r.tabela.toLowerCase().includes(q)
      );
    });
  }, [rows, busca, acao, nomePorId]);

  function linhasExport(): (string | number)[][] {
    return filtradas.map((r) => [
      fmtDataHora(r.created_at),
      nomePorId.get(r.admin_id) ?? r.admin_id,
      acaoLabel(r.acao),
      r.tabela,
      r.registro_id,
      r.motivo ?? "",
    ]);
  }

  const COLS = ["Data/hora", "Administrador", "Ação", "Tabela", "Registro", "Motivo"];

  function exportarCsv() {
    baixarCsv("auditoria-sincro.csv", montarCsv(COLS, linhasExport()));
  }

  function exportarPdf() {
    baixarPdf("auditoria-sincro.pdf", {
      titulo: "Histórico de auditoria — SINCRO",
      subtitulo: `${filtradas.length} registro(s)`,
      linhasInfo: [`Gerado em ${fmtDataHora(new Date().toISOString())}`],
      secoes: [{ colunas: COLS, linhas: linhasExport() }],
      rodape: "SINCRO — registro de ações administrativas",
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="h-6 w-6 text-ponto-entrada" />
          <div>
            <h1 className="text-2xl font-bold text-primary">Auditoria</h1>
            <p className="text-sm text-muted-foreground">
              Ações de administradores e gestores (promoções, exclusões,
              alterações).
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={exportarCsv} disabled={!filtradas.length}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={exportarPdf} disabled={!filtradas.length}>
            <FileText className="mr-2 h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por administrador, ação ou motivo…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={acao} onValueChange={setAcao}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as ações</SelectItem>
            {acoes.map((a) => (
              <SelectItem key={a} value={a}>
                {acaoLabel(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <CardSkeleton />
      ) : filtradas.length === 0 ? (
        <EmptyState
          title="Nenhum registro"
          description="Nenhuma ação de auditoria corresponde aos filtros."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Data/hora</th>
                  <th className="px-4 py-3 font-semibold">Administrador</th>
                  <th className="px-4 py-3 font-semibold">Ação</th>
                  <th className="px-4 py-3 font-semibold">Tabela</th>
                  <th className="px-4 py-3 font-semibold">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((r: AuditoriaRow) => (
                  <tr key={r.id} className="border-b border-border/50 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                      {fmtDataHora(r.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {nomePorId.get(r.admin_id) ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-ponto-entrada/10 px-2.5 py-1 text-xs font-semibold text-ponto-entrada">
                        {acaoLabel(r.acao)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.tabela}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.motivo ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
