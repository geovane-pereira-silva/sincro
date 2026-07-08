import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Webhook,
  Copy,
  Check,
  Play,
  Loader2,
  ShieldCheck,
  ShieldX,
  RefreshCw,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CardSkeleton, EmptyState } from "@/components/admin-ui";
import {
  useStatusWebhook,
  useDispararTeste,
  useEventosAsaas,
  type EventoAsaas,
} from "@/hooks/use-asaas-webhook";
import { montarCsv, baixarCsv } from "@/lib/relatorios";

export const Route = createFileRoute("/_authenticated/admin/webhook/")({
  head: () => ({ meta: [{ title: "Webhook Asaas — SINCRO Admin" }] }),
  component: WebhookPage,
});

function fmtDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(iso));
}

function StatusPill({ ok, on, off }: { ok: boolean; on: string; off: string }) {
  return (
    <span
      className={
        ok
          ? "inline-flex items-center gap-1 rounded-full bg-ponto-entrada/10 px-2.5 py-1 text-xs font-semibold text-ponto-entrada"
          : "inline-flex items-center gap-1 rounded-full bg-ponto-saida/10 px-2.5 py-1 text-xs font-semibold text-ponto-saida"
      }
    >
      {ok ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldX className="h-3.5 w-3.5" />}
      {ok ? on : off}
    </span>
  );
}

function statusEventoClasse(s: string): string {
  if (s === "processado") return "bg-ponto-entrada/10 text-ponto-entrada";
  if (s === "erro") return "bg-ponto-saida/10 text-ponto-saida";
  return "bg-muted text-muted-foreground";
}

function WebhookPage() {
  const { data: status, isLoading } = useStatusWebhook();
  const { data: eventos, isLoading: loadingEv, refetch, isRefetching } =
    useEventosAsaas();
  const teste = useDispararTeste();
  const [copiado, setCopiado] = useState(false);

  async function copiar(v: string) {
    await navigator.clipboard.writeText(v);
    setCopiado(true);
    toast.success("Endpoint copiado.");
    setTimeout(() => setCopiado(false), 1500);
  }

  function exportarCsv() {
    const cols = [
      "Data/hora",
      "Evento",
      "Origem",
      "Token válido",
      "Status",
      "Valor",
      "Cobrança",
      "Assinatura",
      "Erro",
    ];
    const linhas = (eventos ?? []).map((e) => [
      fmtDataHora(e.created_at),
      e.evento,
      e.origem,
      e.token_valido ? "Sim" : "Não",
      e.status_processamento,
      e.valor ?? "",
      e.payment_id ?? "",
      e.subscription_id ?? "",
      e.erro ?? "",
    ]);
    baixarCsv("eventos-webhook-asaas.csv", montarCsv(cols, linhas));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Webhook className="h-6 w-6 text-ponto-entrada" />
        <div>
          <h1 className="text-2xl font-bold text-primary">Webhook Asaas</h1>
          <p className="text-sm text-muted-foreground">
            Teste e valide a integração de pagamentos e acompanhe os eventos
            recebidos.
          </p>
        </div>
      </div>

      {isLoading || !status ? (
        <CardSkeleton />
      ) : (
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StatusPill
              ok={status.tokenConfigurado}
              on="Token configurado"
              off="Token ausente"
            />
            <StatusPill
              ok={status.apiKeyConfigurada}
              on="API key configurada"
              off="API key ausente"
            />
            <span className="inline-flex items-center rounded-full bg-ponto-entrada-intervalo/10 px-2.5 py-1 text-xs font-semibold text-ponto-entrada-intervalo">
              Ambiente: {status.ambiente}
            </span>
          </div>

          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Endpoint do webhook
          </p>
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <code className="flex-1 break-all text-sm text-foreground">
              {status.endpoint}
            </code>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => copiar(status.endpoint)}
            >
              {copiado ? (
                <Check className="h-4 w-4 text-ponto-entrada" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => teste.mutate()}
              disabled={teste.isPending}
            >
              {teste.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Disparar evento de teste
            </Button>
            <Button variant="secondary" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={isRefetching ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
              Atualizar
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Eventos recebidos
        </h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={exportarCsv}
          disabled={!eventos?.length}
        >
          <Download className="mr-2 h-4 w-4" /> CSV
        </Button>
      </div>

      {loadingEv ? (
        <CardSkeleton />
      ) : !eventos?.length ? (
        <EmptyState
          title="Nenhum evento ainda"
          description="Dispare um evento de teste ou aguarde notificações reais do Asaas."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Data/hora</th>
                  <th className="px-4 py-3 font-semibold">Evento</th>
                  <th className="px-4 py-3 font-semibold">Origem</th>
                  <th className="px-4 py-3 font-semibold">Token</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((e: EventoAsaas) => (
                  <tr key={e.id} className="border-b border-border/50 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                      {fmtDataHora(e.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {e.evento}
                      {e.erro && (
                        <span className="block text-xs text-ponto-saida">{e.erro}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {e.origem}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {e.token_valido ? (
                        <Check className="h-4 w-4 text-ponto-entrada" />
                      ) : (
                        <ShieldX className="h-4 w-4 text-ponto-saida" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusEventoClasse(e.status_processamento)}`}
                      >
                        {e.status_processamento}
                      </span>
                    </td>
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
