import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Crown,
  TrendingUp,
  AlertTriangle,
  Users,
  Search,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminProfiles, useAllPremium } from "@/hooks/use-admin";
import {
  useConcederPremiumLote,
  useRevogarPremium,
} from "@/hooks/use-admin-actions";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import {
  EmptyState,
  ListRowsSkeleton,
  MetricsGridSkeleton,
  InitialsAvatar,
} from "@/components/admin-ui";
import {
  formatDataCurta,
  motivoPremiumLabel,
  diasRestantes,
} from "@/lib/admin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/premium/")({
  head: () => ({ meta: [{ title: "Premium & Vendas — Admin SINCRO" }] }),
  component: AdminPremium,
});

const MOTIVOS_LOTE = ["admin_manual", "campanha", "erro_sistema"] as const;

function urgenciaClasse(dias: number) {
  if (dias <= 3) return "bg-ponto-saida/15 text-ponto-saida";
  if (dias <= 7) return "bg-ponto-saida-intervalo/15 text-ponto-saida-intervalo";
  return "bg-ponto-entrada/15 text-ponto-entrada";
}

function AdminPremium() {
  const { data: profiles = [] } = useAdminProfiles();
  const { data: todos = [], isLoading } = useAllPremium();
  const revogar = useRevogarPremium();

  const [loteAberto, setLoteAberto] = useState(false);
  const [aRevogar, setARevogar] = useState<string | null>(null);
  const [filtroMotivo, setFiltroMotivo] = useState("todos");

  const nomePorId = useMemo(() => {
    const m = new Map<string, { nome: string; email: string }>();
    for (const p of profiles)
      m.set(p.id, { nome: p.nome_completo ?? "Sem nome", email: p.email });
    return m;
  }, [profiles]);

  const agora = Date.now();
  const ativos = useMemo(
    () =>
      todos
        .filter((p) => new Date(p.valido_ate).getTime() > agora)
        .sort(
          (a, b) =>
            new Date(a.valido_ate).getTime() - new Date(b.valido_ate).getTime(),
        ),
    [todos, agora],
  );

  const metrics = useMemo(() => {
    const seteDias = agora + 7 * 24 * 3600 * 1000;
    const semanaAtras = agora - 7 * 24 * 3600 * 1000;
    const usuariosAtivos = new Set(ativos.map((p) => p.user_id)).size;
    const novos = todos.filter(
      (p) => new Date(p.created_at).getTime() >= semanaAtras,
    ).length;
    const expirando = ativos.filter(
      (p) => new Date(p.valido_ate).getTime() <= seteDias,
    ).length;
    return { usuariosAtivos, novos, expirando };
  }, [ativos, todos, agora]);

  const porMotivo = useMemo(() => {
    const c = new Map<string, number>();
    for (const p of todos) c.set(p.motivo, (c.get(p.motivo) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [todos]);
  const totalMotivos = todos.length || 1;

  const historico = useMemo(() => {
    if (filtroMotivo === "todos") return todos;
    return todos.filter((p) => p.motivo === filtroMotivo);
  }, [todos, filtroMotivo]);

  const motivosUnicos = useMemo(
    () => [...new Set(todos.map((p) => p.motivo))],
    [todos],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Premium & Vendas</h1>
          <p className="text-sm text-muted-foreground">
            Gestão de acessos premium
          </p>
        </div>
        <Button onClick={() => setLoteAberto(true)}>
          <Crown className="h-4 w-4" /> Conceder em lote
        </Button>
      </div>

      {isLoading ? (
        <MetricsGridSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <MetricCard
            icon={Users}
            value={metrics.usuariosAtivos}
            label="Premium ativos agora"
          />
          <MetricCard
            icon={TrendingUp}
            value={metrics.novos}
            label="Novos esta semana"
          />
          <MetricCard
            icon={AlertTriangle}
            value={metrics.expirando}
            label="Expiram em 7 dias"
            alerta={metrics.expirando > 0}
          />
        </div>
      )}

      {/* Distribuição por motivo */}
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Concedidos por motivo
        </h2>
        {porMotivo.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro.</p>
        ) : (
          <ul className="space-y-2.5">
            {porMotivo.map(([motivo, qtd]) => {
              const pct = Math.round((qtd / totalMotivos) * 100);
              return (
                <li key={motivo}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      {motivoPremiumLabel(motivo)}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {qtd} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-ponto-entrada"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Premium ativos */}
      <div className="overflow-hidden rounded-2xl bg-card shadow-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Premium ativos ({ativos.length})
          </h2>
        </div>
        {isLoading ? (
          <div className="px-5">
            <ListRowsSkeleton rows={5} />
          </div>
        ) : ativos.length === 0 ? (
          <EmptyState
            title="Nenhum premium ativo"
            description="Conceda acesso premium para começar."
          />
        ) : (
          <ul className="divide-y divide-border">
            {ativos.map((p) => {
              const u = nomePorId.get(p.user_id);
              const dias = diasRestantes(p.valido_ate);
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <InitialsAvatar name={u?.nome} email={u?.email} size={36} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/admin/usuarios/$id"
                      params={{ id: p.user_id }}
                      className="block truncate text-sm font-semibold text-primary hover:underline"
                    >
                      {u?.nome ?? "Usuário"}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {motivoPremiumLabel(p.motivo)} · até{" "}
                      {formatDataCurta(p.valido_ate)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                      urgenciaClasse(dias),
                    )}
                  >
                    {dias}d
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setARevogar(p.id)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Revogar premium"
                  >
                    <ShieldOff className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Histórico */}
      <div className="overflow-hidden rounded-2xl bg-card shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Histórico completo ({historico.length})
          </h2>
          <Select value={filtroMotivo} onValueChange={setFiltroMotivo}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="Motivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os motivos</SelectItem>
              {motivosUnicos.map((m) => (
                <SelectItem key={m} value={m}>
                  {motivoPremiumLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <div className="px-5">
            <ListRowsSkeleton rows={5} />
          </div>
        ) : historico.length === 0 ? (
          <EmptyState title="Nenhum registro" />
        ) : (
          <ul className="divide-y divide-border">
            {historico.slice(0, 200).map((p) => {
              const u = nomePorId.get(p.user_id);
              const ativo = new Date(p.valido_ate).getTime() > agora;
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-primary">
                      {u?.nome ?? "Usuário"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {motivoPremiumLabel(p.motivo)} ·{" "}
                      {formatDataCurta(p.created_at)} →{" "}
                      {formatDataCurta(p.valido_ate)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                      ativo
                        ? "bg-ponto-entrada/15 text-ponto-entrada"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {ativo ? "Ativo" : "Expirado"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BulkPremiumDialog open={loteAberto} onOpenChange={setLoteAberto} />

      <AdminConfirmDialog
        open={aRevogar != null}
        onOpenChange={(v) => !v && setARevogar(null)}
        title="Revogar premium"
        description="O acesso premium será removido imediatamente."
        confirmLabel="Revogar"
        destructive
        loading={revogar.isPending}
        onConfirm={(motivo) => {
          if (!aRevogar) return;
          revogar.mutate(
            { premiumId: aRevogar, motivo },
            { onSuccess: () => setARevogar(null) },
          );
        }}
      />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  value,
  label,
  alerta,
}: {
  icon: typeof Crown;
  value: number;
  label: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-card">
      <Icon
        className={cn(
          "h-6 w-6",
          alerta ? "text-ponto-saida" : "text-ponto-entrada",
        )}
        strokeWidth={2}
      />
      <p className="mt-3 text-4xl font-bold tabular-nums text-primary">
        {value}
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">{label}</p>
    </div>
  );
}

function BulkPremiumDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: profiles = [] } = useAdminProfiles();
  const conceder = useConcederPremiumLote();
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [dias, setDias] = useState("30");
  const [motivo, setMotivo] = useState<string>("admin_manual");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return profiles.slice(0, 50);
    return profiles
      .filter(
        (p) =>
          (p.nome_completo ?? "").toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [profiles, busca]);

  function toggle(id: string) {
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const diasNum = Number(dias);
  const podeConfirmar =
    sel.size > 0 && Number.isFinite(diasNum) && diasNum > 0 && !conceder.isPending;

  function handleConfirmar() {
    conceder.mutate(
      { userIds: [...sel], dias: diasNum, motivo },
      {
        onSuccess: () => {
          setSel(new Set());
          setBusca("");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Conceder premium em lote</DialogTitle>
          <DialogDescription>
            Selecione os usuários e defina a duração do acesso.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="lote-dias">Dias</Label>
            <Input
              id="lote-dias"
              type="number"
              min={1}
              value={dias}
              onChange={(e) => setDias(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_LOTE.map((m) => (
                  <SelectItem key={m} value={m}>
                    {motivoPremiumLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar usuários…"
            className="pl-10"
          />
        </div>

        <div className="max-h-64 overflow-auto rounded-xl border border-border">
          {filtrados.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              Nenhum usuário.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtrados.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-secondary">
                    <input
                      type="checkbox"
                      checked={sel.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="h-4 w-4 rounded border-border accent-[hsl(var(--ponto-entrada))]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {p.nome_completo || "Sem nome"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.email}
                      </p>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <p className="mr-auto self-center text-sm text-muted-foreground">
            {sel.size} selecionado(s)
          </p>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={conceder.isPending}
          >
            Cancelar
          </Button>
          <Button disabled={!podeConfirmar} onClick={handleConfirmar}>
            Conceder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
