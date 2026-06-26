import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, ChevronLeft, ChevronRight, Flame, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useAdminProfiles,
  useActivePremium,
  useAdminRegistros,
} from "@/hooks/use-admin";
import { premiumMap, computeStreaks, formatDataCurta } from "@/lib/admin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/usuarios/")({
  component: AdminUsuarios,
});

const PAGE_SIZE = 20;

function AdminUsuarios() {
  const { data: profiles = [], isLoading: lp } = useAdminProfiles();
  const { data: premium = [], isLoading: lpr } = useActivePremium();
  const { data: regs = [], isLoading: lr } = useAdminRegistros(45);

  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(0);

  const pmap = useMemo(() => premiumMap(premium), [premium]);

  const streaks = useMemo(() => {
    const tzByUser: Record<string, string> = {};
    for (const p of profiles) tzByUser[p.id] = p.timezone;
    return computeStreaks(regs, tzByUser);
  }, [regs, profiles]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        (p.nome_completo ?? "").toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q),
    );
  }, [profiles, busca]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);
  const visiveis = filtrados.slice(
    pageSafe * PAGE_SIZE,
    pageSafe * PAGE_SIZE + PAGE_SIZE,
  );

  const loading = lp || lpr || lr;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          {filtrados.length} {filtrados.length === 1 ? "usuário" : "usuários"}
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPage(0);
          }}
          placeholder="Buscar por nome ou email…"
          className="h-12 pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-card shadow-card">
          {/* Cabeçalho desktop */}
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-border px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground md:grid">
            <span>Usuário</span>
            <span>Cadastro</span>
            <span>Streak</span>
            <span>Indicações</span>
            <span className="text-right">Status</span>
          </div>

          <ul className="divide-y divide-border">
            {visiveis.map((p) => {
              const prem = pmap.get(p.id);
              const streak = streaks[p.id] ?? 0;
              return (
                <li
                  key={p.id}
                  className="grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <Link
                      to="/admin/usuarios/$id"
                      params={{ id: p.id }}
                      className="truncate text-sm font-semibold text-primary hover:underline"
                    >
                      {p.nome_completo || "Sem nome"}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.email}
                    </p>
                  </div>

                  <span className="text-sm text-muted-foreground">
                    <span className="md:hidden">Cadastro: </span>
                    {formatDataCurta(p.created_at)}
                  </span>

                  <span className="inline-flex items-center gap-1 text-sm text-foreground">
                    <Flame
                      className={cn(
                        "h-3.5 w-3.5",
                        streak >= 2 ? "text-[#EA580C]" : "text-muted-foreground/40",
                      )}
                    />
                    {streak} {streak === 1 ? "dia" : "dias"}
                  </span>

                  <span className="text-sm text-foreground">
                    <span className="md:hidden">Indicações: </span>
                    {p.referral_count}
                  </span>

                  <div className="flex items-center justify-between gap-3 md:justify-end">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-bold",
                        prem
                          ? "bg-ponto-entrada/15 text-ponto-entrada"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {prem
                        ? `Premium até ${formatDataCurta(prem.valido_ate)}`
                        : "Gratuito"}
                    </span>
                    <Link
                      to="/admin/usuarios/$id"
                      params={{ id: p.id }}
                      className="shrink-0 text-xs font-semibold text-ponto-entrada hover:underline"
                    >
                      Ver detalhes
                    </Link>
                  </div>
                </li>
              );
            })}
            {visiveis.length === 0 && (
              <li className="py-10 text-center text-sm text-muted-foreground">
                Nenhum usuário encontrado.
              </li>
            )}
          </ul>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={pageSafe === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {pageSafe + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pageSafe >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Próxima <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
