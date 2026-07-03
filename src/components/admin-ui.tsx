import { type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TIPO_INFO, type Tipo } from "@/lib/ponto";
import { formatDataCurta } from "@/lib/admin";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Ilustração inline reutilizável para estados vazios                  */
/* ------------------------------------------------------------------ */
export function EmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      className={cn("h-20 w-20", className)}
      aria-hidden="true"
    >
      <rect
        x="16"
        y="24"
        width="64"
        height="52"
        rx="10"
        className="fill-muted"
      />
      <rect
        x="26"
        y="38"
        width="30"
        height="6"
        rx="3"
        className="fill-border"
      />
      <rect
        x="26"
        y="52"
        width="44"
        height="6"
        rx="3"
        className="fill-border"
      />
      <circle
        cx="66"
        cy="66"
        r="16"
        className="fill-card stroke-ponto-entrada"
        strokeWidth="3"
      />
      <path
        d="M60 66h12M66 60v12"
        className="stroke-ponto-entrada"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  illustration,
  className,
}: {
  title: string;
  description?: string;
  illustration?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      {illustration ?? <EmptyIllustration />}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar de iniciais                                                  */
/* ------------------------------------------------------------------ */
export function InitialsAvatar({
  name,
  email,
  size = 48,
  className,
}: {
  name?: string | null;
  email?: string | null;
  size?: number;
  className?: string;
}) {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : base.slice(0, 2).toUpperCase();
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-sidebar-accent font-bold text-ponto-entrada",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badge de status premium                                            */
/* ------------------------------------------------------------------ */
export function PremiumBadge({
  validoAte,
  className,
}: {
  validoAte?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold",
        validoAte
          ? "bg-ponto-entrada/15 text-ponto-entrada"
          : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {validoAte ? `Premium até ${formatDataCurta(validoAte)}` : "Gratuito"}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Pill colorida por tipo de batida                                   */
/* ------------------------------------------------------------------ */
const PILL_POR_TIPO: Record<Tipo, string> = {
  entrada: "bg-ponto-entrada/15 text-ponto-entrada",
  saida_intervalo: "bg-ponto-saida-intervalo/15 text-ponto-saida-intervalo",
  entrada_intervalo:
    "bg-ponto-entrada-intervalo/15 text-ponto-entrada-intervalo",
  saida: "bg-ponto-saida/15 text-ponto-saida",
};

export function TipoPill({ tipo }: { tipo: string }) {
  const info = TIPO_INFO[tipo as Tipo];
  const cls =
    PILL_POR_TIPO[tipo as Tipo] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold",
        cls,
      )}
    >
      {info?.label ?? tipo}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Esqueletos de carregamento                                         */
/* ------------------------------------------------------------------ */
export function MetricCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-card">
      <Skeleton className="h-6 w-6 rounded-lg" />
      <Skeleton className="mt-3 h-9 w-16" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}

export function MetricsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-card p-5 shadow-card", className)}>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-3/4" />
      <Skeleton className="mt-2 h-3 w-2/3" />
    </div>
  );
}
