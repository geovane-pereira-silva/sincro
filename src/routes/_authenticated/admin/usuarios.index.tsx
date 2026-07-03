import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useAdminProfiles,
  useActivePremium,
  useAdminRegistros,
} from "@/hooks/use-admin";
import { premiumMap, computeStreaks, formatDataCurta } from "@/lib/admin";
import {
  EmptyState,
  InitialsAvatar,
  PremiumBadge,
  ListRowsSkeleton,
} from "@/components/admin-ui";
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

      <div className="overflow-hidden rounded-2xl bg-card shadow-card">
        {loading ? (
          <div className="px-5">
            <ListRowsSkeleton rows={8} />
          </div>
        ) : visiveis.length === 0 ? (
          <EmptyState
            title="Nenhum usuário encontrado"
            description={
              busca.trim()
                ? `Nenhum resultado para "${busca.trim()}". Tente outro termo.`
                : "Ainda não há usuários cadastrados."
            }
          />
        ) : (
          <>
            <p className="px-4 pt-3 text-[11px] text-muted-foreground md:hidden">
              Deslize para o lado para ver mais →
            </p>
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                {/* Cabeçalho */}
                <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-border bg-secondary px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Usuário</span>
                  <span>Cadastro</span>
                  <span>Streak</span>
                  <span>Status</span>
                  <span className="text-right">Ação</span>
                </div>

                <ul>
                  {visiveis.map((p) => {
                    const prem = pmap.get(p.id);
                    const streak = streaks[p.id] ?? 0;
                    return (
                      <li
                        key={p.id}
                        className="grid grid-cols-[2.5fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-border px-5 py-3 transition-colors last:border-0 hover:bg-secondary"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <InitialsAvatar
                            name={p.nome_completo}
                            email={p.email}
                            size={38}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-primary">
                              {p.nome_completo || "Sem nome"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.email}
                            </p>
                          </div>
                        </div>

                        <span className="text-sm text-muted-foreground">
                          {formatDataCurta(p.created_at)}
                        </span>

                        <span className="inline-flex items-center gap-1 text-sm text-foreground">
                          <Flame
                            className={cn(
                              "h-3.5 w-3.5",
                              streak >= 2
                                ? "text-[#EA580C]"
                                : "text-muted-foreground/40",
                            )}
                          />
                          {streak} {streak === 1 ? "dia" : "dias"}
                        </span>

                        <PremiumBadge validoAte={prem?.valido_ate} />

                        <div className="text-right">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg border-ponto-entrada text-ponto-entrada hover:bg-ponto-entrada/10 hover:text-ponto-entrada"
                          >
                            <Link
                              to="/admin/usuarios/$id"
                              params={{ id: p.id }}
                            >
                              Ver detalhes
                            </Link>
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>

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
