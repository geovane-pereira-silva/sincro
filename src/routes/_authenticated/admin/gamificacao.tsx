import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy, Flame, Loader2 } from "lucide-react";
import { useAdminProfiles, useAdminRegistros } from "@/hooks/use-admin";
import { computeStreaks } from "@/lib/admin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/gamificacao")({
  component: AdminGamificacao,
});

const MEDALHA = ["🥇", "🥈", "🥉"];

function AdminGamificacao() {
  const { data: profiles = [], isLoading: lp } = useAdminProfiles();
  const { data: regs = [], isLoading: lr } = useAdminRegistros(45);

  const topIndicadores = useMemo(
    () =>
      [...profiles]
        .filter((p) => (p.referral_count ?? 0) > 0)
        .sort((a, b) => b.referral_count - a.referral_count)
        .slice(0, 10),
    [profiles],
  );

  const topStreaks = useMemo(() => {
    const tzByUser: Record<string, string> = {};
    for (const p of profiles) tzByUser[p.id] = p.timezone;
    const streaks = computeStreaks(regs, tzByUser);
    return profiles
      .map((p) => ({ p, streak: streaks[p.id] ?? 0 }))
      .filter((x) => x.streak > 0)
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 10);
  }, [profiles, regs]);

  if (lp || lr) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const pddio = topIndicadores.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Gamificação</h1>
        <p className="text-sm text-muted-foreground">
          Ranking de indicações e sequências
        </p>
      </div>

      {/* Pódio */}
      {pddio.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {pddio.map((p, i) => (
            <div
              key={p.id}
              className={cn(
                "rounded-2xl p-5 text-center shadow-card",
                i === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-card",
              )}
            >
              <span className="text-3xl">{MEDALHA[i]}</span>
              <Link
                to="/admin/usuarios/$id"
                params={{ id: p.id }}
                className={cn(
                  "mt-2 block truncate text-sm font-bold hover:underline",
                  i === 0 ? "text-primary-foreground" : "text-primary",
                )}
              >
                {p.nome_completo || "Sem nome"}
              </Link>
              <p
                className={cn(
                  "font-mono text-xs",
                  i === 0
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground",
                )}
              >
                {p.referral_code}
              </p>
              <p
                className={cn(
                  "mt-2 text-2xl font-bold tabular-nums",
                  i === 0 ? "text-ponto-entrada" : "text-primary",
                )}
              >
                {p.referral_count}
              </p>
              <p
                className={cn(
                  "text-xs",
                  i === 0
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground",
                )}
              >
                indicações
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top indicadores */}
        <div className="rounded-2xl bg-card p-5 shadow-card md:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <Trophy className="h-4 w-4 text-ponto-entrada" /> Top 10 indicadores
          </h2>
          <ul className="divide-y divide-border">
            {topIndicadores.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">
                  {i < 3 ? MEDALHA[i] : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/admin/usuarios/$id"
                    params={{ id: p.id }}
                    className="truncate text-sm font-semibold text-primary hover:underline"
                  >
                    {p.nome_completo || "Sem nome"}
                  </Link>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {p.referral_code}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-primary">
                  {p.referral_count}
                </span>
              </li>
            ))}
            {topIndicadores.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma indicação ainda.
              </li>
            )}
          </ul>
        </div>

        {/* Top streaks */}
        <div className="rounded-2xl bg-card p-5 shadow-card md:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <Flame className="h-4 w-4 text-[#EA580C]" /> Maiores sequências
          </h2>
          <ul className="divide-y divide-border">
            {topStreaks.map((x, i) => (
              <li key={x.p.id} className="flex items-center gap-3 py-3">
                <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <Link
                  to="/admin/usuarios/$id"
                  params={{ id: x.p.id }}
                  className="min-w-0 flex-1 truncate text-sm font-semibold text-primary hover:underline"
                >
                  {x.p.nome_completo || "Sem nome"}
                </Link>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[#EA580C]">
                  <Flame className="h-3.5 w-3.5" />
                  {x.streak}
                </span>
              </li>
            ))}
            {topStreaks.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma sequência ativa.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
