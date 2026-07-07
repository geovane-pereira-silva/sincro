import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MetricCard({
  icon: Icon,
  value,
  label,
  tone,
  hint,
}: {
  icon: (props: { className?: string; strokeWidth?: number }) => ReactNode;
  value: string | number;
  label: string;
  tone?: "up" | "down";
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-card">
      <Icon
        className={cn(
          "h-6 w-6",
          tone === "down" ? "text-ponto-saida" : "text-ponto-entrada",
        )}
        strokeWidth={2}
      />
      <p className="mt-3 text-2xl font-bold tabular-nums text-primary md:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">{label}</p>
      {hint && <div className="mt-1 text-xs">{hint}</div>}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Cabeçalho de coluna clicável para ordenação. */
export function SortHeader<T extends string>({
  label,
  col,
  ordem,
  onSort,
  className,
}: {
  label: string;
  col: T;
  ordem: { col: T; dir: "asc" | "desc" };
  onSort: (c: T) => void;
  className?: string;
}) {
  const active = ordem.col === col;
  return (
    <th className={cn("pb-2 pr-3 font-medium", className)}>
      <button
        type="button"
        onClick={() => onSort(col)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {label}
        <span className="text-[10px]">
          {active ? (ordem.dir === "asc" ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
}
