import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Activity, Clock, Share2, Loader2 } from "lucide-react";
import { useAdminProfiles, useActivePremium, useAdminRegistros } from "@/hooks/use-admin";
import { premiumMap, formatDataCurta } from "@/lib/admin";
import { dayKeyInTz } from "@/lib/ponto";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

const TZ_REF = "America/Sao_Paulo";

function MetricCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-card">
      <Icon className="h-5 w-5 text-ponto-entrada" strokeWidth={2} />
      <p className="mt-3 text-3xl font-bold tabular-nums text-primary">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function AdminDashboard() {
  const { data: profiles = [], isLoading: lp } = useAdminProfiles();
  const { data: premium = [], isLoading: lpr } = useActivePremium();
  const { data: regs7 = [], isLoading: lr } = useAdminRegistros(7);

  const pmap = useMemo(() => premiumMap(premium), [premium]);

  const metrics = useMemo(() => {
    const total = profiles.length;
    const ativos = new Set(regs7.map((r) => r.user_id)).size;
    const hojeKey = dayKeyInTz(new Date(), TZ_REF);
    const batidasHoje = regs7.filter(
      (r) => dayKeyInTz(new Date(r.data_hora), TZ_REF) === hojeKey,
    ).length;
    const indicacoes = profiles.reduce(
      (acc, p) => acc + (p.referral_count ?? 0),
      0,
    );
    return { total, ativos, batidasHoje, indicacoes };
  }, [profiles, regs7]);

  const recentes = useMemo(() => profiles.slice(0, 5), [profiles]);

  const loading = lp || lpr || lr;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do SINCRO</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={Users} value={metrics.total} label="Usuários cadastrados" />
        <MetricCard icon={Activity} value={metrics.ativos} label="Ativos (7 dias)" />
        <MetricCard icon={Clock} value={metrics.batidasHoje} label="Batidas hoje" />
        <MetricCard icon={Share2} value={metrics.indicacoes} label="Indicações realizadas" />
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-card md:p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Usuários recentes
        </h2>
        <ul className="divide-y divide-border">
          {recentes.map((p) => {
            const prem = pmap.get(p.id);
            return (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    to="/admin/usuarios/$id"
                    params={{ id: p.id }}
                    className="truncate text-sm font-semibold text-primary hover:underline"
                  >
                    {p.nome_completo || "Sem nome"}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                </div>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                  {formatDataCurta(p.created_at)}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                    prem
                      ? "bg-ponto-entrada/15 text-ponto-entrada"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {prem ? "Premium" : "Gratuito"}
                </span>
              </li>
            );
          })}
          {recentes.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">
              Nenhum usuário cadastrado.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
