import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, FileText, Ban, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ListRowsSkeleton } from "@/components/admin-ui";
import { NovaSolicitacaoDialog } from "@/components/nova-solicitacao-dialog";
import {
  useMinhasSolicitacoes,
  useCancelarSolicitacao,
} from "@/hooks/use-solicitacoes";
import {
  TIPO_SOLICITACAO_LABEL,
  TIPO_SOLICITACAO_CLASSE,
  STATUS_SOLICITACAO_LABEL,
  STATUS_SOLICITACAO_CLASSE,
  fmtDataRef,
  tempoRelativo,
  type TipoSolicitacao,
  type StatusSolicitacao,
} from "@/lib/solicitacoes";
import { cn } from "@/lib/utils";
import { mensagemErro } from "@/lib/erros";

export const Route = createFileRoute("/_authenticated/solicitacoes")({
  head: () => ({ meta: [{ title: "Minhas Solicitações — SINCRO" }] }),
  component: SolicitacoesPage,
});

function SolicitacoesPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: solicitacoes = [], isLoading } = useMinhasSolicitacoes();
  const cancelar = useCancelarSolicitacao();
  const [novaOpen, setNovaOpen] = useState(false);

  async function handleCancelar(id: string) {
    try {
      await cancelar.mutateAsync(id);
      toast.success("Solicitação cancelada.");
    } catch (e) {
      toast.error(mensagemErro(e));
    }
  }

  return (
    <AppShell profile={profile ?? null}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">Solicitações</h1>
          <p className="text-sm text-muted-foreground">
            Ajustes, abonos, férias e folgas.
          </p>
        </div>
        <Button size="sm" onClick={() => setNovaOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova
        </Button>
      </div>

      {isLoading ? (
        <ListRowsSkeleton />
      ) : solicitacoes.length === 0 ? (
        <EmptyState
          title="Nenhuma solicitação"
          description="Crie uma solicitação para ajustar pontos ou pedir abonos."
        />
      ) : (
        <div className="space-y-3">
          {solicitacoes.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl bg-card p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      TIPO_SOLICITACAO_CLASSE[s.tipo as TipoSolicitacao],
                    )}
                  >
                    {TIPO_SOLICITACAO_LABEL[s.tipo as TipoSolicitacao] ??
                      s.tipo}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      STATUS_SOLICITACAO_CLASSE[
                        s.status as StatusSolicitacao
                      ],
                    )}
                  >
                    {STATUS_SOLICITACAO_LABEL[s.status as StatusSolicitacao]}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {tempoRelativo(s.created_at)}
                </span>
              </div>

              <p className="mt-2 text-sm text-foreground">
                Ref.: {fmtDataRef(s.data_referencia)}
                {s.horario_solicitado ? ` · ${s.horario_solicitado}` : ""}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{s.motivo}</p>

              {s.anexo_url && (
                <p className="mt-2 flex items-center gap-1 text-xs text-primary">
                  <FileText className="h-3.5 w-3.5" /> Anexo enviado
                </p>
              )}

              {s.observacao_gestor && (
                <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <strong>Gestor:</strong> {s.observacao_gestor}
                </p>
              )}

              {s.status === "pendente" && (
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-destructive"
                    onClick={() => handleCancelar(s.id)}
                    disabled={cancelar.isPending}
                  >
                    {cancelar.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Ban className="mr-1 h-4 w-4" />
                    )}
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <NovaSolicitacaoDialog open={novaOpen} onOpenChange={setNovaOpen} />
    </AppShell>
  );
}
