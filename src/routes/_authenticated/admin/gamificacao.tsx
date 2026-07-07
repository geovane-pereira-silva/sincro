import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy, Flame } from "lucide-react";
import { useAdminProfiles, useAdminRegistros } from "@/hooks/use-admin";
import { computeStreaks } from "@/lib/admin";
import { EmptyState, InitialsAvatar, ListRowsSkeleton } from "@/components/admin-ui";
import { PlanFilter, usePlanFilter } from "@/components/plan-filter";
import { usePlanoPorUsuario } from "@/hooks/use-financeiro";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/gamificacao")({
  component: AdminGamificacao,
});

const MEDALHA = ["🥇", "🥈", "🥉"];

function AdminGamificacao() {
  const { data: allProfiles = [], isLoading: lp } = useAdminProfiles();
  const { data: regs = [], isLoading: lr } = useAdminRegistros(45);
  const { plano, setPlano } = usePlanFilter();
  const { data: planoPorUsuario = {} } = usePlanoPorUsuario();

  const profiles = useMemo(() => {
    if (plano === "todos") return allProfiles;
    return allProfiles.filter((p) => (planoPorUsuario[p.id] ?? "free") === plano);
  }, [allProfiles, planoPorUsuario, plano]);

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

  const loading = lp || lr;
  const podio = topIndicadores.slice(0, 3);
  const resto = topIndicadores.slice(3);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Gamificação</h1>
          <p className="text-sm text-muted-foreground">
            Ranking de indicações e sequências
          </p>
        </div>
        <PlanFilter value={plano} onChange={setPlano} />
      </div>


      {loading ? (
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <ListRowsSkeleton rows={6} />
        </div>
      ) : topIndicadores.length === 0 ? (
        <div className="rounded-2xl bg-card shadow-card">
          <EmptyState
            title="Nenhuma indicação registrada ainda"
            description="Quando os usuários começarem a indicar amigos, o ranking aparecerá aqui."
          />
        </div>
      ) : (
        <>
          {/* Pódio top 3 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {podio.map((p, i) => (
              <div
                key={p.id}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-sidebar-accent p-5 text-center shadow-card"
              >
                <span className="text-4xl">{MEDALHA[i]}</span>
                <Link
                  to="/admin/usuarios/$id"
                  params={{ id: p.id }}
                  className="mt-2 block truncate text-sm font-bold text-primary-foreground hover:underline"
                >
                  {p.nome_completo || "Sem nome"}
                </Link>
                <p className="font-mono text-xs text-primary-foreground/60">
                  {p.referral_code}
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-ponto-entrada">
                  {p.referral_count}
                </p>
                <p className="text-xs text-primary-foreground/70">indicações</p>
              </div>
            ))}
          </div>

          {/* Lista 4–10 */}
          {resto.length > 0 && (
            <div className="rounded-2xl bg-card p-5 shadow-card md:p-6">
              <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Trophy className="h-4 w-4 text-ponto-entrada" /> Demais
                indicadores
              </h2>
              <ul className="divide-y divide-border">
                {resto.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">
                      {i + 4}
                    </span>
                    <InitialsAvatar
                      name={p.nome_completo}
                      email={p.email}
                      size={34}
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/admin/usuarios/$id"
                        params={{ id: p.id }}
                        className="block truncate text-sm font-semibold text-primary hover:underline"
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
              </ul>
            </div>
          )}
        </>
      )}

      {/* Seção de sequências */}
      <div className="rounded-2xl bg-card p-5 shadow-card md:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <span className="text-base">🔥</span> Maiores sequências
        </h2>
        {loading ? (
          <ListRowsSkeleton rows={4} />
        ) : topStreaks.length === 0 ? (
          <EmptyState title="Nenhuma sequência ativa ainda" />
        ) : (
          <ul className="divide-y divide-border">
            {topStreaks.map((x, i) => (
              <li key={x.p.id} className="flex items-center gap-3 py-3">
                <span
                  className={cn(
                    "w-6 shrink-0 text-center text-sm font-bold",
                    i < 3 ? "" : "text-muted-foreground",
                  )}
                >
                  {i < 3 ? MEDALHA[i] : i + 1}
                </span>
                <InitialsAvatar
                  name={x.p.nome_completo}
                  email={x.p.email}
                  size={34}
                />
                <Link
                  to="/admin/usuarios/$id"
                  params={{ id: x.p.id }}
                  className="min-w-0 flex-1 truncate text-sm font-semibold text-primary hover:underline"
                >
                  {x.p.nome_completo || "Sem nome"}
                </Link>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[#EA580C]">
                  <Flame className="h-3.5 w-3.5" />
                  {x.streak} {x.streak === 1 ? "dia" : "dias"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
