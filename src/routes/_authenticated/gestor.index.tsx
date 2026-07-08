import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Users,
  Layers,
  CalendarClock,
  Plus,
  Pencil,
  Trash2,
  Send,
  Ban,
  RotateCcw,
  Download,
  LogOut,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EmptyState, ListRowsSkeleton } from "@/components/admin-ui";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { ColaboradorDialog } from "@/components/colaborador-dialog";
import { ConviteColaboradorDialog } from "@/components/convite-colaborador-dialog";
import { SetorDialog } from "@/components/setor-dialog";
import { JornadaDialog } from "@/components/jornada-dialog";
import { SincroMark } from "@/components/sincro-logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import {
  useEmpresa,
  useSetores,
  useColaboradores,
  useJornadasEmpresa,
} from "@/hooks/use-empresas";
import {
  useExcluirSetor,
  useExcluirColaborador,
  useToggleColaborador,
  useExcluirJornada,
} from "@/hooks/use-empresa-actions";
import { useExportarPontos } from "@/hooks/use-exportar-pontos";
import {
  colaboradorStatus,
  tipoJornadaLabel,
  fmtDataBr,
  type Colaborador,
  type Setor,
  type JornadaEmpresa,
} from "@/lib/empresas";
import {
  montarRelatorioPontos,
  linhaParaColunas,
  COLUNAS_PONTO,
} from "@/lib/ponto-export";
import { formatDuracao, formatSaldo, type PontoRegistro } from "@/lib/ponto";
import { montarCsv, baixarCsv } from "@/lib/relatorios";

export const Route = createFileRoute("/_authenticated/gestor/")({
  head: () => ({ meta: [{ title: "Painel do Gestor — SINCRO" }] }),
  component: GestorPortal,
});

const STATUS_CLASSE: Record<string, string> = {
  ativo: "bg-ponto-entrada/10 text-ponto-entrada",
  pendente: "bg-ponto-saida-intervalo/10 text-ponto-saida-intervalo",
  expirado: "bg-ponto-saida/10 text-ponto-saida",
  demitido: "bg-muted text-muted-foreground",
  inativo: "bg-muted text-muted-foreground",
};

function GestorPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile, isLoading: loadingProfile } = useProfile(user?.id);
  const empresaId = profile?.empresa_id ?? undefined;

  const { data: empresa } = useEmpresa(empresaId);
  const { data: setores = [], isLoading: loadingSet } = useSetores(empresaId);
  const { data: colaboradores = [], isLoading: loadingCol } =
    useColaboradores(empresaId);
  const { data: jornadas = [], isLoading: loadingJor } =
    useJornadasEmpresa(empresaId);

  const excluirSetor = useExcluirSetor();
  const excluirColab = useExcluirColaborador();
  const toggleColab = useToggleColaborador();
  const excluirJornada = useExcluirJornada();
  const exportar = useExportarPontos();

  const [colabDialog, setColabDialog] = useState<Colaborador | null | "novo">(null);
  const [conviteOpen, setConviteOpen] = useState(false);
  const [setorDialog, setSetorDialog] = useState<Setor | null | "novo">(null);
  const [jornadaDialog, setJornadaDialog] = useState<
    JornadaEmpresa | null | "novo"
  >(null);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    onConfirm: (motivo: string) => void;
    destructive?: boolean;
    exigirMotivo?: boolean;
  }>(null);
  const [exportando, setExportando] = useState<string | null>(null);

  const ativos = useMemo(
    () => colaboradores.filter((c) => c.ativo).length,
    [colaboradores],
  );

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function exportarColaborador(c: Colaborador) {
    if (!c.user_id) {
      toast.error("Este colaborador ainda não aceitou o convite (sem conta).");
      return;
    }
    setExportando(c.id);
    try {
      const d = new Date();
      const inicio = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const fim = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const res = await exportar({ userId: c.user_id, inicio, fim });
      const rel = montarRelatorioPontos(
        res.registros as PontoRegistro[],
        res.profile.carga_horaria_diaria,
        res.profile.timezone,
      );
      if (!rel.linhas.length) {
        toast.error("Sem registros neste mês.");
        return;
      }
      const corpo = [
        ...rel.linhas.map(linhaParaColunas),
        [],
        ["Total trabalhado", formatDuracao(rel.totalTrabalhadoMin)],
        ["Saldo do período", formatSaldo(rel.totalSaldoMin)],
      ];
      baixarCsv(
        `pontos-${c.nome_completo.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${inicio}_a_${fim}.csv`,
        montarCsv([...COLUNAS_PONTO], corpo as (string | number)[][]),
      );
      toast.success("Exportação gerada.");
    } catch (e) {
      toast.error((e as Error)?.message || "Erro ao exportar.");
    } finally {
      setExportando(null);
    }
  }

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (profile && profile.tipo_conta !== "gestor") {
    navigate({ to: "/ponto", replace: true });
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 bg-primary px-4 text-primary-foreground md:px-8">
        <SincroMark size={36} />
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-primary-foreground">
            SINCRO
          </span>
          <span className="rounded-full bg-ponto-entrada px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ponto-entrada-foreground">
            Gestor
          </span>
        </div>
        <button
          onClick={logout}
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-primary-foreground/30 px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 pb-16 md:px-8">
        <div className="mb-5 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-ponto-entrada" />
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {empresa?.nome ?? "Minha empresa"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {colaboradores.length} colaborador(es) · {ativos} ativo(s)
            </p>
          </div>
        </div>

        {!empresaId ? (
          <EmptyState
            title="Sem empresa vinculada"
            description="Seu perfil de gestor ainda não está vinculado a uma empresa. Contate o administrador."
          />
        ) : (
          <Tabs defaultValue="colaboradores">
            <TabsList className="flex w-full flex-wrap">
              <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
              <TabsTrigger value="setores">Setores</TabsTrigger>
              <TabsTrigger value="jornadas">Jornadas</TabsTrigger>
            </TabsList>

            {/* COLABORADORES */}
            <TabsContent value="colaboradores" className="space-y-3">
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setConviteOpen(true)}>
                  <Send className="mr-2 h-4 w-4" /> Convidar
                </Button>
                <Button size="sm" onClick={() => setColabDialog("novo")}>
                  <Plus className="mr-2 h-4 w-4" /> Novo
                </Button>
              </div>
              {loadingCol ? (
                <ListRowsSkeleton />
              ) : colaboradores.length === 0 ? (
                <EmptyState title="Nenhum colaborador" description="Cadastre ou convide colaboradores." />
              ) : (
                <div className="overflow-hidden rounded-2xl bg-card shadow-card">
                  {colaboradores.map((c) => {
                    const st = colaboradorStatus(c);
                    return (
                      <div
                        key={c.id}
                        className="flex flex-wrap items-center gap-3 border-b border-border/50 px-4 py-3 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">
                            {c.nome_completo}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.cargo ?? "—"} · {c.email ?? "sem e-mail"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSE[st] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {st}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Exportar pontos (mês)"
                            onClick={() => exportarColaborador(c)}
                            disabled={exportando === c.id}
                          >
                            {exportando === c.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setColabDialog(c)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title={c.ativo ? "Desativar" : "Reativar"}
                            onClick={() =>
                              setConfirm({
                                title: c.ativo
                                  ? "Desativar colaborador?"
                                  : "Reativar colaborador?",
                                exigirMotivo: true,
                                onConfirm: (motivo) =>
                                  toggleColab.mutate({
                                    id: c.id,
                                    ativo: !c.ativo,
                                    motivo,
                                  }),
                              })
                            }
                          >
                            {c.ativo ? (
                              <Ban className="h-4 w-4" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() =>
                              setConfirm({
                                title: "Excluir colaborador?",
                                destructive: true,
                                exigirMotivo: true,
                                onConfirm: (motivo) =>
                                  excluirColab.mutate({ id: c.id, motivo }),
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* SETORES */}
            <TabsContent value="setores" className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setSetorDialog("novo")}>
                  <Plus className="mr-2 h-4 w-4" /> Novo setor
                </Button>
              </div>
              {loadingSet ? (
                <ListRowsSkeleton />
              ) : setores.length === 0 ? (
                <EmptyState title="Nenhum setor" description="Crie setores para organizar os colaboradores." />
              ) : (
                <div className="overflow-hidden rounded-2xl bg-card shadow-card">
                  {setores.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 border-b border-border/50 px-4 py-3 last:border-0"
                    >
                      <Layers className="h-4 w-4 text-ponto-entrada" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{s.nome}</p>
                        {s.descricao && (
                          <p className="truncate text-xs text-muted-foreground">
                            {s.descricao}
                          </p>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setSetorDialog(s)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() =>
                          setConfirm({
                            title: "Excluir setor?",
                            destructive: true,
                            exigirMotivo: true,
                            onConfirm: (motivo) =>
                              excluirSetor.mutate({ id: s.id, motivo }),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* JORNADAS */}
            <TabsContent value="jornadas" className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setJornadaDialog("novo")}>
                  <Plus className="mr-2 h-4 w-4" /> Nova jornada
                </Button>
              </div>
              {loadingJor ? (
                <ListRowsSkeleton />
              ) : jornadas.length === 0 ? (
                <EmptyState title="Nenhuma jornada" description="Cadastre jornadas de trabalho." />
              ) : (
                <div className="overflow-hidden rounded-2xl bg-card shadow-card">
                  {jornadas.map((j) => (
                    <div
                      key={j.id}
                      className="flex items-center gap-3 border-b border-border/50 px-4 py-3 last:border-0"
                    >
                      <CalendarClock className="h-4 w-4 text-ponto-entrada" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{j.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {tipoJornadaLabel(j.tipo)} · desde {fmtDataBr(j.created_at)}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setJornadaDialog(j)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() =>
                          setConfirm({
                            title: "Excluir jornada?",
                            destructive: true,
                            exigirMotivo: true,
                            onConfirm: (motivo) =>
                              excluirJornada.mutate({ id: j.id, motivo }),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Dialogs */}
      {empresaId && (colabDialog !== null) && (
        <ColaboradorDialog
          open
          onOpenChange={(v) => !v && setColabDialog(null)}
          empresaId={empresaId}
          setores={setores}
          jornadas={jornadas}
          colaborador={colabDialog === "novo" ? null : colabDialog}
        />
      )}
      {empresaId && (
        <ConviteColaboradorDialog
          open={conviteOpen}
          onOpenChange={setConviteOpen}
          empresaId={empresaId}
          empresaNome={empresa?.nome ?? ""}
          setores={setores}
          jornadas={jornadas}
        />
      )}
      {empresaId && setorDialog !== null && (
        <SetorDialog
          open
          onOpenChange={(v) => !v && setSetorDialog(null)}
          empresaId={empresaId}
          setor={setorDialog === "novo" ? null : setorDialog}
        />
      )}
      {empresaId && jornadaDialog !== null && (
        <JornadaDialog
          open
          onOpenChange={(v) => !v && setJornadaDialog(null)}
          empresaId={empresaId}
          jornada={jornadaDialog === "novo" ? null : jornadaDialog}
        />
      )}
      <AdminConfirmDialog
        open={confirm !== null}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.title ?? ""}
        destructive={confirm?.destructive}
        exigirMotivo={confirm?.exigirMotivo}
        onConfirm={(motivo) => {
          confirm?.onConfirm(motivo);
          setConfirm(null);
        }}
      />
    </div>
  );
}
