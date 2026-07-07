import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Lock,
  Unlock,
  Crown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminProfiles,
  useActivePremium,
  useAllBatidas,
  type AdminProfile,
} from "@/hooks/use-admin";
import { useToggleBloqueio } from "@/hooks/use-admin-actions";
import {
  EditProfileDialog,
  GrantPremiumDialog,
} from "@/components/admin-user-dialogs";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import {
  premiumMap,
  formatDataCurta,
} from "@/lib/admin";
import {
  EmptyState,
  InitialsAvatar,
  ListRowsSkeleton,
} from "@/components/admin-ui";
import { PlanFilter, usePlanFilter } from "@/components/plan-filter";
import { usePlanoPorUsuario } from "@/hooks/use-financeiro";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/usuarios/")({
  component: AdminUsuarios,
});

const PAGE_SIZE = 20;
const SETE_DIAS = 7 * 24 * 3600 * 1000;

type Ordenacao = "cadastro" | "acesso" | "batidas" | "indicacoes";

function AdminUsuarios() {
  const { data: profiles = [], isLoading: lp } = useAdminProfiles();
  const { data: premium = [], isLoading: lpr } = useActivePremium();
  const { data: batidas = [], isLoading: lb } = useAllBatidas();
  const toggleBloqueio = useToggleBloqueio();

  const [busca, setBusca] = useState("");
  const [fPlano, setFPlano] = useState("todos");
  const [fStatus, setFStatus] = useState("todos");
  const [fOrigem, setFOrigem] = useState("todos");
  const [ordem, setOrdem] = useState<Ordenacao>("cadastro");
  const [page, setPage] = useState(0);

  const [editar, setEditar] = useState<AdminProfile | null>(null);
  const [premiar, setPremiar] = useState<AdminProfile | null>(null);
  const [bloquear, setBloquear] = useState<AdminProfile | null>(null);

  const pmap = useMemo(() => premiumMap(premium), [premium]);

  // Estatísticas de batidas por usuário.
  const stats = useMemo(() => {
    const m = new Map<string, { total: number; ultima: string }>();
    for (const b of batidas) {
      const cur = m.get(b.user_id);
      if (!cur) m.set(b.user_id, { total: 1, ultima: b.data_hora });
      else {
        cur.total += 1;
        if (b.data_hora > cur.ultima) cur.ultima = b.data_hora;
      }
    }
    return m;
  }, [batidas]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const agora = Date.now();
    let lista = profiles.filter((p) => {
      if (
        q &&
        !(p.nome_completo ?? "").toLowerCase().includes(q) &&
        !p.email.toLowerCase().includes(q)
      )
        return false;

      const prem = pmap.get(p.id);
      if (fPlano === "gratuito" && prem) return false;
      if (fPlano === "premium" && !prem) return false;

      if (fOrigem === "direto" && p.referred_by) return false;
      if (fOrigem === "indicado" && !p.referred_by) return false;

      const st = stats.get(p.id);
      const ativo =
        st != null && agora - new Date(st.ultima).getTime() <= SETE_DIAS;
      if (fStatus === "ativos" && (!ativo || p.bloqueado)) return false;
      if (fStatus === "inativos" && (ativo || p.bloqueado)) return false;
      if (fStatus === "bloqueados" && !p.bloqueado) return false;

      return true;
    });

    lista = [...lista].sort((a, b) => {
      switch (ordem) {
        case "acesso": {
          const ua = stats.get(a.id)?.ultima ?? "";
          const ub = stats.get(b.id)?.ultima ?? "";
          return ub.localeCompare(ua);
        }
        case "batidas":
          return (stats.get(b.id)?.total ?? 0) - (stats.get(a.id)?.total ?? 0);
        case "indicacoes":
          return (b.referral_count ?? 0) - (a.referral_count ?? 0);
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });
    return lista;
  }, [profiles, busca, fPlano, fStatus, fOrigem, ordem, pmap, stats]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);
  const visiveis = filtrados.slice(
    pageSafe * PAGE_SIZE,
    pageSafe * PAGE_SIZE + PAGE_SIZE,
  );

  const loading = lp || lpr || lb;

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(0);
    };
  }

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
          onChange={(e) => resetPage(setBusca)(e.target.value)}
          placeholder="Buscar por nome ou email…"
          className="h-12 pl-10"
        />
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <FiltroSelect
          value={fPlano}
          onChange={resetPage(setFPlano)}
          placeholder="Plano"
          options={[
            ["todos", "Todos os planos"],
            ["gratuito", "Gratuito"],
            ["premium", "Premium ativo"],
          ]}
        />
        <FiltroSelect
          value={fStatus}
          onChange={resetPage(setFStatus)}
          placeholder="Status"
          options={[
            ["todos", "Todos os status"],
            ["ativos", "Ativos (7 dias)"],
            ["inativos", "Inativos"],
            ["bloqueados", "Bloqueados"],
          ]}
        />
        <FiltroSelect
          value={fOrigem}
          onChange={resetPage(setFOrigem)}
          placeholder="Origem"
          options={[
            ["todos", "Todas origens"],
            ["direto", "Direto"],
            ["indicado", "Indicado"],
          ]}
        />
        <FiltroSelect
          value={ordem}
          onChange={(v) => setOrdem(v as Ordenacao)}
          placeholder="Ordenar"
          options={[
            ["cadastro", "Cadastro"],
            ["acesso", "Último acesso"],
            ["batidas", "Total batidas"],
            ["indicacoes", "Indicações"],
          ]}
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
            description="Ajuste a busca ou os filtros."
          />
        ) : (
          <>
            <p className="px-4 pt-3 text-[11px] text-muted-foreground xl:hidden">
              Deslize para o lado para ver mais →
            </p>
            <div className="overflow-x-auto">
              <div className="min-w-[880px]">
                <div className="grid grid-cols-[2.2fr_1fr_1fr_1.3fr_0.9fr_auto] items-center gap-4 border-b border-border bg-secondary px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Usuário</span>
                  <span>Último acesso</span>
                  <span>Batidas</span>
                  <span>Plano</span>
                  <span>Origem</span>
                  <span className="text-right">Ações</span>
                </div>

                <ul>
                  {visiveis.map((p) => {
                    const prem = pmap.get(p.id);
                    const st = stats.get(p.id);
                    return (
                      <li
                        key={p.id}
                        className="grid grid-cols-[2.2fr_1fr_1fr_1.3fr_0.9fr_auto] items-center gap-4 border-b border-border px-5 py-3 transition-colors last:border-0 hover:bg-secondary"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <InitialsAvatar
                            name={p.nome_completo}
                            email={p.email}
                            size={38}
                          />
                          <div className="min-w-0">
                            <Link
                              to="/admin/usuarios/$id"
                              params={{ id: p.id }}
                              className="block truncate text-sm font-semibold text-primary hover:underline"
                            >
                              {p.nome_completo || "Sem nome"}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.email}
                            </p>
                          </div>
                        </div>

                        <span className="text-sm text-muted-foreground">
                          {st ? formatDataCurta(st.ultima) : "—"}
                        </span>

                        <span className="text-sm tabular-nums text-foreground">
                          {st?.total ?? 0}
                        </span>

                        <span>
                          {p.bloqueado ? (
                            <Pill tone="danger">Bloqueada</Pill>
                          ) : prem ? (
                            <Pill tone="ok">
                              Até {formatDataCurta(prem.valido_ate)}
                            </Pill>
                          ) : (
                            <Pill tone="muted">Gratuito</Pill>
                          )}
                        </span>

                        <span className="text-xs text-muted-foreground">
                          {p.referred_by ? "Indicado" : "Direto"}
                        </span>

                        <div className="flex items-center justify-end gap-1">
                          <IconBtn
                            label="Editar perfil"
                            onClick={() => setEditar(p)}
                          >
                            <Pencil className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn
                            label="Conceder premium"
                            onClick={() => setPremiar(p)}
                          >
                            <Crown className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn
                            label={p.bloqueado ? "Desbloquear" : "Bloquear"}
                            onClick={() => setBloquear(p)}
                            danger={!p.bloqueado}
                          >
                            {p.bloqueado ? (
                              <Unlock className="h-4 w-4" />
                            ) : (
                              <Lock className="h-4 w-4" />
                            )}
                          </IconBtn>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Página {pageSafe + 1} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={pageSafe === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={pageSafe >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <EditProfileDialog
        perfil={editar}
        open={editar != null}
        onOpenChange={(v) => !v && setEditar(null)}
      />
      <GrantPremiumDialog
        userId={premiar?.id ?? null}
        nome={premiar?.nome_completo ?? undefined}
        open={premiar != null}
        onOpenChange={(v) => !v && setPremiar(null)}
      />
      <AdminConfirmDialog
        open={bloquear != null}
        onOpenChange={(v) => !v && setBloquear(null)}
        title={bloquear?.bloqueado ? "Desbloquear conta" : "Bloquear conta"}
        description={
          bloquear?.bloqueado
            ? "O usuário voltará a acessar o app normalmente."
            : "O usuário não conseguirá acessar o app até ser desbloqueado."
        }
        confirmLabel={bloquear?.bloqueado ? "Desbloquear" : "Bloquear"}
        destructive={!bloquear?.bloqueado}
        loading={toggleBloqueio.isPending}
        onConfirm={(motivo) => {
          if (!bloquear) return;
          toggleBloqueio.mutate(
            {
              userId: bloquear.id,
              bloqueado: !bloquear.bloqueado,
              motivo,
            },
            { onSuccess: () => setBloquear(null) },
          );
        }}
      />
    </div>
  );
}

function FiltroSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: [string, string][];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "ok" | "danger" | "muted";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold",
        tone === "ok" && "bg-ponto-entrada/15 text-ponto-entrada",
        tone === "danger" && "bg-ponto-saida/15 text-ponto-saida",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function IconBtn({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary",
        danger ? "hover:text-ponto-saida" : "hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}
