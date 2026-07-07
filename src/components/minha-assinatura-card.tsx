import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles, CreditCard, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePremium } from "@/components/premium-context";
import { useMinhaAssinatura } from "@/hooks/use-assinatura";
import { cancelarMinhaAssinatura } from "@/lib/assinaturas.functions";
import { mensagemErro } from "@/lib/erros";
import { formatPremiumUntil } from "@/lib/premium";
import {
  PLANOS,
  fmtMoedaBR,
  fmtDataBR,
  type PlanoPago,
} from "@/lib/asaas";
import { cn } from "@/lib/utils";

const MOTIVOS = [
  "Muito caro",
  "Não uso mais",
  "Encontrei alternativa",
  "Outro",
];

export function MinhaAssinaturaCard({ userId }: { userId: string | undefined }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isPremium, premiumUntil } = usePremium();
  const { data: assinatura, isLoading } = useMinhaAssinatura(userId);
  const cancelarFn = useServerFn(cancelarMinhaAssinatura);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [motivo, setMotivo] = useState<string>("");
  const [detalhe, setDetalhe] = useState("");
  const [cancelando, setCancelando] = useState(false);

  async function handleCancelar() {
    setCancelando(true);
    try {
      const texto = [motivo, detalhe.trim()].filter(Boolean).join(" — ");
      await cancelarFn({ data: { motivo: texto || undefined } });
      await queryClient.invalidateQueries();
      toast.success("Assinatura cancelada. Seu premium continua até o vencimento.");
      setConfirmOpen(false);
    } catch (e) {
      toast.error(mensagemErro(e));
    } finally {
      setCancelando(false);
    }
  }

  if (isLoading) {
    return (
      <div className="h-[92px] animate-pulse rounded-2xl border border-border bg-card" />
    );
  }

  const assinanteAtivo =
    assinatura &&
    (assinatura.status === "active" || assinatura.status === "overdue");
  const overdue = assinatura?.status === "overdue";
  const planoInfo = assinatura
    ? PLANOS[assinatura.plano as PlanoPago]
    : undefined;

  // Assinante pagante ativo (ou em atraso)
  if (assinanteAtivo && planoInfo) {
    return (
      <>
        <div
          className={cn(
            "rounded-2xl border p-5",
            overdue
              ? "border-amber-500/40 bg-amber-500/8"
              : "border-ponto-entrada/30 bg-ponto-entrada/8",
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                overdue ? "bg-amber-500/15" : "bg-ponto-entrada/15",
              )}
            >
              {overdue ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <CreditCard className="h-5 w-5 text-ponto-entrada" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">
                {overdue ? "Pagamento pendente" : planoInfo.nome}
              </p>
              <p className="text-xs text-muted-foreground">
                {fmtMoedaBR(Number(assinatura.valor))} · próximo vencimento{" "}
                {fmtDataBR(assinatura.proximo_vencimento)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            {overdue ? (
              <Button
                onClick={() => navigate({ to: "/planos" })}
                className="h-10 rounded-full bg-amber-500 text-white hover:bg-amber-500/90"
              >
                Regularizar
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(true)}
                className="h-10 rounded-full border-ponto-saida/40 text-ponto-saida hover:bg-ponto-saida/10 hover:text-ponto-saida"
              >
                Cancelar assinatura
              </Button>
            )}
          </div>
        </div>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-[420px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>Cancelar assinatura</DialogTitle>
              <DialogDescription>
                Seu premium continua ativo até{" "}
                {fmtDataBR(assinatura.proximo_vencimento)}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                Nos conta o motivo (opcional)
              </p>
              <div className="flex flex-wrap gap-2">
                {MOTIVOS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotivo(m)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      motivo === m
                        ? "border-ponto-entrada bg-ponto-entrada/10 text-ponto-entrada"
                        : "border-border text-muted-foreground hover:bg-secondary/50",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <Textarea
                value={detalhe}
                onChange={(e) => setDetalhe(e.target.value)}
                placeholder="Quer detalhar? (opcional)"
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setConfirmOpen(false)}
                disabled={cancelando}
              >
                Manter assinatura
              </Button>
              <Button
                onClick={handleCancelar}
                disabled={cancelando}
                className="bg-ponto-saida text-white hover:bg-ponto-saida/90"
              >
                {cancelando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Confirmar cancelamento"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Premium via ação social (referral/streak) — sem assinatura paga ativa
  if (isPremium) {
    return (
      <div className="rounded-2xl border border-ponto-entrada/30 bg-ponto-entrada/8 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ponto-entrada/15">
            <Sparkles className="h-5 w-5 text-ponto-entrada" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">
              Premium ativo até {formatPremiumUntil(premiumUntil)}
            </p>
            <p className="text-xs text-muted-foreground">
              Origem: recompensa (indicação / streak / perfil)
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/planos" })}
          className="mt-4 h-10 rounded-full border-ponto-entrada/40 text-ponto-entrada hover:bg-ponto-entrada/10 hover:text-ponto-entrada"
        >
          Ver planos pagos
        </Button>
      </div>
    );
  }

  // Gratuito
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">Plano gratuito</p>
        <p className="text-xs text-muted-foreground">
          Assine e desbloqueie todos os recursos premium.
        </p>
      </div>
      <Button
        onClick={() => navigate({ to: "/planos" })}
        className="shrink-0 rounded-full bg-ponto-entrada text-ponto-entrada-foreground hover:bg-ponto-entrada/90"
      >
        Ver planos
      </Button>
    </div>
  );
}
