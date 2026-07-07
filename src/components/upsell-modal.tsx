import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Share2, Users, Flame, UserRound } from "lucide-react";
import { copiarLinkReferral } from "@/lib/premium";
import { cn } from "@/lib/utils";

const BENEFICIOS = [
  "Relatório em PDF formatado",
  "Envio por email",
  "Histórico completo ilimitado",
  "Gráficos de produtividade",
  "Comparativo entre meses",
  "Espelho de ponto detalhado",
];

const ACOES: { icon: string; texto: string; recompensa: string }[] = [
  { icon: "🔗", texto: "Indique um amigo", recompensa: "+30 dias" },
  { icon: "🔥", texto: "7 dias seguidos de registro", recompensa: "+7 dias" },
  { icon: "👤", texto: "Complete seu perfil", recompensa: "+3 dias" },
];

const ICONE_ACAO = [Share2, Flame, UserRound];

export function UpsellModal({
  open,
  onOpenChange,
  feature,
  referralCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string | null;
  referralCode: string | null;
}) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] gap-0 overflow-hidden rounded-2xl border-0 bg-card p-0">
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <DialogHeader className="items-center text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-ponto-entrada/12">
              <Sparkles className="h-8 w-8 text-ponto-entrada" />
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              Recurso Premium
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Desbloqueie {feature ?? "este recurso"} e muito mais.
            </DialogDescription>
          </DialogHeader>

          {/* Benefícios */}
          <ul className="mt-5 space-y-2.5">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ponto-entrada/12">
                  <Check className="h-3.5 w-3.5 text-ponto-entrada" />
                </span>
                <span className="text-sm text-foreground">{b}</span>
              </li>
            ))}
          </ul>

          {/* Separador */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Como desbloquear grátis
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* Cards de ação */}
          <div className="space-y-2.5">
            {ACOES.map((a, i) => {
              const Icone = ICONE_ACAO[i];
              return (
                <div
                  key={a.texto}
                  className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card shadow-sm">
                    <Icone className="h-4.5 w-4.5 text-primary" />
                  </span>
                  <span className="flex-1 text-sm font-medium text-foreground">
                    {a.texto}
                  </span>
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-ponto-entrada/15 px-2.5 py-1 text-xs font-bold text-ponto-entrada">
                    {a.recompensa}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Ações */}
          <div className="mt-6 space-y-2.5">
            <Button
              onClick={() => copiarLinkReferral(referralCode)}
              className="h-12 w-full rounded-xl bg-ponto-entrada text-base font-semibold text-ponto-entrada-foreground hover:bg-ponto-entrada/90"
            >
              <Share2 className="h-4 w-4" />
              Compartilhar meu link
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className={cn(
                "h-12 w-full rounded-xl border-border text-base font-medium text-muted-foreground",
              )}
            >
              Fechar
            </Button>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground/70">
            Já tem premium? Pode levar alguns instantes para ativar.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
