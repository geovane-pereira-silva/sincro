import { type ReactNode } from "react";
import { Lock, Sparkles, Share2, X } from "lucide-react";
import { usePremium } from "@/components/premium-context";
import { formatPremiumUntil } from "@/lib/premium";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Pill dourada de Premium ativo                                       */
/* ------------------------------------------------------------------ */
export function PremiumPill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] px-2.5 py-1 text-[11px] font-bold text-[#3d2a00] shadow-sm",
        className,
      )}
    >
      <Sparkles className="h-3 w-3" />
      Premium
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Overlay de bloqueio sobre um componente premium                     */
/* ------------------------------------------------------------------ */
export function LockedOverlay({
  feature,
  children,
  className,
}: {
  feature: string;
  children: ReactNode;
  className?: string;
}) {
  const { openUpsell } = usePremium();
  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      <div aria-hidden="true" className="pointer-events-none select-none blur-[3px]">
        {children}
      </div>
      <button
        type="button"
        onClick={() => openUpsell(feature)}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/70 backdrop-blur-[1px] transition-colors hover:bg-card/60"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ponto-entrada/15">
          <Lock className="h-5 w-5 text-ponto-entrada" />
        </span>
        <span className="text-sm font-semibold text-foreground">
          Recurso premium
        </span>
        <span className="text-xs text-muted-foreground">Toque para desbloquear</span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Botão bloqueado (com cadeado) que abre o upsell                     */
/* ------------------------------------------------------------------ */
export function LockedButton({
  feature,
  icon,
  children,
  className,
}: {
  feature: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const { openUpsell } = usePremium();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => openUpsell(feature)}
      className={cn("rounded-full text-muted-foreground", className)}
    >
      {icon}
      {children}
      <Lock className="h-3.5 w-3.5" />
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/* Card de gate (para períodos/histórico bloqueado)                    */
/* ------------------------------------------------------------------ */
export function UpsellGateCard({
  feature,
  title,
  description,
}: {
  feature: string;
  title: string;
  description: string;
}) {
  const { openUpsell } = usePremium();
  return (
    <button
      type="button"
      onClick={() => openUpsell(feature)}
      className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-ponto-entrada/40 bg-ponto-entrada/5 px-6 py-8 text-center transition-colors hover:bg-ponto-entrada/10"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ponto-entrada/15">
        <Lock className="h-5 w-5 text-ponto-entrada" />
      </span>
      <span className="text-sm font-semibold text-foreground">{title}</span>
      <span className="max-w-xs text-xs text-muted-foreground">{description}</span>
      <span className="mt-1 text-xs font-bold text-ponto-entrada">
        Desbloquear SINCRO Premium →
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Banner verde-claro reutilizável (home e relatório)                  */
/* ------------------------------------------------------------------ */
export function UpsellBanner({
  texto,
  actionLabel,
  onAction,
  onDismiss,
  className,
}: {
  texto: ReactNode;
  actionLabel: string;
  onAction: () => void;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-xl border-l-[3px] border-ponto-entrada bg-[#F0FDF9] px-4 py-3",
        className,
      )}
    >
      <div className="flex-1 pr-4">
        <p className="text-sm leading-relaxed text-primary">{texto}</p>
        <button
          type="button"
          onClick={onAction}
          className="mt-1.5 inline-flex items-center gap-1 text-sm font-bold text-ponto-entrada hover:underline"
        >
          <Share2 className="h-3.5 w-3.5" />
          {actionLabel}
        </button>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dispensar"
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/5"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card de status Premium (tela de configurações)                      */
/* ------------------------------------------------------------------ */
export function PremiumStatusCard() {
  const { isPremium, premiumUntil, isLoading, openUpsell } = usePremium();

  if (isLoading) {
    return (
      <div className="h-[92px] animate-pulse rounded-2xl border border-border bg-card" />
    );
  }

  if (isPremium) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-ponto-entrada/30 bg-ponto-entrada/8 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ponto-entrada/15">
          <Sparkles className="h-5 w-5 text-ponto-entrada" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">SINCRO Premium ativo</p>
          <p className="text-xs text-muted-foreground">
            Ativo até {formatPremiumUntil(premiumUntil)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">Plano gratuito</p>
        <p className="text-xs text-muted-foreground">
          Desbloqueie recursos premium sem pagar nada.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => openUpsell()}
        className="shrink-0 rounded-full border-ponto-entrada/40 text-ponto-entrada hover:bg-ponto-entrada/10 hover:text-ponto-entrada"
      >
        Ver como desbloquear
      </Button>
    </div>
  );
}

