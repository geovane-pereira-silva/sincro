import { useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  X,
  FileText,
  Loader2,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, ListRowsSkeleton } from "@/components/admin-ui";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import {
  useSolicitacoesEmpresa,
  useAprovarSolicitacao,
  useRejeitarSolicitacao,
} from "@/hooks/use-solicitacoes";
import {
  TIPO_SOLICITACAO_LABEL,
  TIPO_SOLICITACAO_CLASSE,
  STATUS_SOLICITACAO_LABEL,
  STATUS_SOLICITACAO_CLASSE,
  fmtDataRef,
  tempoRelativo,
  type Solicitacao,
  type TipoSolicitacao,
  type StatusSolicitacao,
} from "@/lib/solicitacoes";
import { cn } from "@/lib/utils";
import { mensagemErro } from "@/lib/erros";

export const Route = createFileRoute("/_authenticated/gestor/solicitacoes")({
  head: () => ({ meta: [{ title: "Solicitações — Gestor SINCRO" }] }),
  component: GestorSolicitacoes,
});

function GestorSolicitacoes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: profile, isLoading: loadingProfile } = useProfile(user?.id);
  const { data: solicitacoes = [], isLoading } = useSolicitacoesEmpresa();

  const aprovar = useAprovarSolicitacao();
  const rejeitar = useRejeitarSolicitacao();

  const [dialog, setDialog] = useState<{
    sol: Solicitacao;
    acao: "aprovar" | "rejeitar";
  } | null>(null);
  const [resposta, setResposta] = useState("");

  const pendentes = useMemo(
    () => solicitacoes.filter((s) => s.status === "pendente"),
    [solicitacoes],
  );
  const resolvidas = useMemo(
    () => solicitacoes.filter((s) => s.status !== "pendente"),
    [solicitacoes],
  );

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

  async function confirmar() {
    if (!dialog) return;
    try {
      if (dialog.acao === "aprovar") {
        await aprovar.mutateAsync({ id: dialog.sol.id, observacao: resposta });
        toast.success("Solicitação aprovada.");
      } else {
        if (!resposta.trim()) {
          toast.error("Informe o motivo da recusa.");
          return;
        }
        await rejeitar.mutateAsync({ id: dialog.sol.id, motivo: resposta });
        toast.success("Solicitação rejeitada.");
      }
      setDialog(null);
      setResposta("");
    } catch (e) {
      toast.error(mensagemErro(e));
    }
  }

  async function abrirAnexo(path: string) {
    const { data, error } = await supabase.storage
      .from("anexos-solicitacoes")
      .createSignedUrl(path, 300);
    if (error || !data) {
      toast.error("Não foi possível abrir o anexo.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  const salvando = aprovar.isPending || rejeitar.isPending;

  function renderLista(lista: Solicitacao[]) {
    if (isLoading) return <ListRowsSkeleton />;
    if (lista.length === 0)
      return (
        <EmptyState
          title="Nada por aqui"
          description="Nenhuma solicitação nesta lista."
          illustration={<Inbox className="h-10 w-10 text-muted-foreground" />}
        />
      );
    return (
      <div className="space-y-3">
        {lista.map((s) => (
          <div key={s.id} className="rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    TIPO_SOLICITACAO_CLASSE[s.tipo as TipoSolicitacao],
                  )}
                >
                  {TIPO_SOLICITACAO_LABEL[s.tipo as TipoSolicitacao] ?? s.tipo}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    STATUS_SOLICITACAO_CLASSE[s.status as StatusSolicitacao],
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
              <button
                onClick={() => abrirAnexo(s.anexo_url!)}
                className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <FileText className="h-3.5 w-3.5" /> Ver anexo
              </button>
            )}

            {s.resposta_gestor && (
              <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <strong>Resposta:</strong> {s.resposta_gestor}
              </p>
            )}

            {s.status === "pendente" && (
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-destructive"
                  onClick={() => {
                    setResposta("");
                    setDialog({ sol: s, acao: "rejeitar" });
                  }}
                >
                  <X className="mr-1 h-4 w-4" /> Rejeitar
                </Button>
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setResposta("");
                    setDialog({ sol: s, acao: "aprovar" });
                  }}
                >
                  <Check className="mr-1 h-4 w-4" /> Aprovar
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 bg-primary px-4 text-primary-foreground md:px-8">
        <Link
          to="/gestor"
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-lg font-bold tracking-tight">Solicitações</span>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 pb-16 md:px-8">
        <Tabs defaultValue="pendentes">
          <TabsList className="w-full">
            <TabsTrigger value="pendentes" className="flex-1">
              Pendentes {pendentes.length > 0 && `(${pendentes.length})`}
            </TabsTrigger>
            <TabsTrigger value="resolvidas" className="flex-1">
              Resolvidas
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pendentes" className="mt-4">
            {renderLista(pendentes)}
          </TabsContent>
          <TabsContent value="resolvidas" className="mt-4">
            {renderLista(resolvidas)}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.acao === "aprovar"
                ? "Aprovar solicitação"
                : "Rejeitar solicitação"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            rows={3}
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            placeholder={
              dialog?.acao === "aprovar"
                ? "Observação (opcional)"
                : "Motivo da recusa"
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={salvando}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
