import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Crown,
  ShieldOff,
  Share2,
  Pencil,
  Lock,
  Unlock,
  Loader2,
  Save,
  UserPlus,
  LogIn,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  EditProfileDialog,
  GrantPremiumDialog,
} from "@/components/admin-user-dialogs";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import {
  useToggleBloqueio,
  useRevogarPremium,
  useSalvarNotas,
} from "@/hooks/use-admin-actions";
import { lerNotasAdmin } from "@/lib/admin-actions.functions";
import { useAuditLog } from "@/hooks/use-admin";
import {
  formatDataCurta,
  formatDataHora,
  motivoPremiumLabel,
} from "@/lib/admin";
import {
  EmptyState,
  InitialsAvatar,
  PremiumBadge,
  CardSkeleton,
} from "@/components/admin-ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/usuarios/$id")({
  component: AdminUsuarioDetalhe,
});

interface TimelineItem {
  data: string;
  titulo: string;
  descricao?: string;
  icon: typeof Clock;
}

function AdminUsuarioDetalhe() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const lerNotas = useServerFn(lerNotasAdmin);

  const toggleBloqueio = useToggleBloqueio();
  const revogar = useRevogarPremium();
  const salvarNotas = useSalvarNotas();

  const [editarOpen, setEditarOpen] = useState(false);
  const [premiarOpen, setPremiarOpen] = useState(false);
  const [bloquearOpen, setBloquearOpen] = useState(false);
  const [revogarId, setRevogarId] = useState<string | null>(null);
  const [notas, setNotas] = useState<string | null>(null);

  const { data: perfil, isLoading: lp } = useQuery({
    queryKey: ["admin-user", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, nome_completo, email, profissao, carga_horaria_diaria, timezone, onboarding_concluido, created_at, referral_code, referral_count, referred_by, bloqueado",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: premium = [] } = useQuery({
    queryKey: ["admin-user-premium", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("premium_access")
        .select("id, motivo, valido_ate, created_at")
        .eq("user_id", id)
        .order("valido_ate", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: registros = [] } = useQuery({
    queryKey: ["admin-user-registros", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ponto_registros")
        .select("id, tipo, data_hora")
        .eq("user_id", id)
        .order("data_hora", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: audit = [] } = useAuditLog();

  // Notas internas (via service_role — só superadmin).
  useQuery({
    queryKey: ["admin-user-notas", id],
    queryFn: async () => {
      const r = await lerNotas({ data: { userId: id } });
      setNotas(r.notas);
      return r.notas;
    },
  });

  const premiumAtivo = useMemo(
    () =>
      premium.find((p) => new Date(p.valido_ate).getTime() > Date.now()) ??
      null,
    [premium],
  );

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!perfil) return [];
    const items: TimelineItem[] = [];
    items.push({
      data: perfil.created_at,
      titulo: "Cadastro",
      descricao: "Conta criada",
      icon: UserPlus,
    });
    if (perfil.onboarding_concluido) {
      items.push({
        data: perfil.created_at,
        titulo: "Onboarding concluído",
        descricao: "Configuração inicial finalizada",
        icon: LogIn,
      });
    }
    if (registros.length > 0) {
      items.push({
        data: registros[0].data_hora,
        titulo: "Primeira batida",
        descricao: "Começou a registrar ponto",
        icon: Clock,
      });
    }
    for (const pr of premium) {
      items.push({
        data: pr.created_at,
        titulo: "Premium concedido",
        descricao: `${motivoPremiumLabel(pr.motivo)} · até ${formatDataCurta(pr.valido_ate)}`,
        icon: Crown,
      });
    }
    for (const a of audit) {
      const alvo =
        a.registro_id === id ||
        (a.dados_anteriores as { user_id?: string } | null)?.user_id === id;
      if (!alvo) continue;
      if (a.acao === "conceder_premium") continue; // já coberto acima
      const map: Record<string, string> = {
        bloquear_conta: "Conta bloqueada",
        desbloquear_conta: "Conta desbloqueada",
        editar_perfil: "Perfil editado pelo admin",
        revogar_premium: "Premium revogado",
      };
      items.push({
        data: a.created_at,
        titulo: map[a.acao] ?? a.acao,
        descricao: a.motivo ?? undefined,
        icon:
          a.acao === "bloquear_conta"
            ? ShieldAlert
            : a.acao === "revogar_premium"
              ? ShieldOff
              : Pencil,
      });
    }
    return items.sort((x, y) => y.data.localeCompare(x.data));
  }, [perfil, registros, premium, audit, id]);

  if (lp) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <EmptyState
        title="Usuário não encontrado"
        description="O usuário pode ter sido removido."
        illustration={
          <Link
            to="/admin/usuarios"
            className="mt-2 text-sm font-semibold text-ponto-entrada hover:underline"
          >
            Voltar à lista
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/usuarios"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Usuários
      </Link>

      {/* Cabeçalho */}
      <div className="rounded-2xl bg-card p-5 shadow-card md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <InitialsAvatar
              name={perfil.nome_completo}
              email={perfil.email}
              size={56}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-bold text-primary">
                  {perfil.nome_completo || "Sem nome"}
                </h1>
                {perfil.bloqueado && (
                  <span className="rounded-full bg-ponto-saida/15 px-2 py-0.5 text-[11px] font-bold text-ponto-saida">
                    Bloqueada
                  </span>
                )}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {perfil.email}
              </p>
              {perfil.profissao && (
                <p className="truncate text-xs text-muted-foreground">
                  {perfil.profissao}
                </p>
              )}
            </div>
          </div>
          <PremiumBadge validoAte={premiumAtivo?.valido_ate} />
        </div>

        {/* Ações rápidas */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditarOpen(true)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPremiarOpen(true)}
          >
            <Crown className="h-4 w-4" /> Conceder premium
          </Button>
          {premiumAtivo && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRevogarId(premiumAtivo.id)}
              className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <ShieldOff className="h-4 w-4" /> Revogar premium
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBloquearOpen(true)}
            className={cn(
              !perfil.bloqueado &&
                "border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive",
            )}
          >
            {perfil.bloqueado ? (
              <>
                <Unlock className="h-4 w-4" /> Desbloquear
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" /> Bloquear
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Perfil + Indicações */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Perfil
          </h2>
          <dl className="space-y-2 text-sm">
            <Linha label="Profissão" valor={perfil.profissao || "—"} />
            <Linha
              label="Carga horária diária"
              valor={`${perfil.carga_horaria_diaria}h`}
            />
            <Linha label="Fuso horário" valor={perfil.timezone} />
            <Linha
              label="Onboarding"
              valor={perfil.onboarding_concluido ? "Concluído" : "Pendente"}
            />
            <Linha label="Cadastro" valor={formatDataCurta(perfil.created_at)} />
          </dl>
        </div>

        <div className="rounded-2xl bg-card p-5 shadow-card">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Indicações
          </h2>
          <div className="flex items-center gap-3">
            <Share2 className="h-5 w-5 text-ponto-entrada" />
            <div>
              <p className="text-2xl font-bold text-primary">
                {perfil.referral_count}
              </p>
              <p className="text-xs text-muted-foreground">indicações feitas</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Código de indicação
          </p>
          <p className="font-mono text-base font-bold tracking-wider text-primary">
            {perfil.referral_code || "—"}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Origem:{" "}
            <span className="font-medium text-foreground">
              {perfil.referred_by ? "Indicado" : "Direto"}
            </span>
          </p>
        </div>
      </div>

      {/* Notas internas */}
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Notas internas (só superadmin)
          </h2>
          <Button
            size="sm"
            variant="ghost"
            disabled={notas === null || salvarNotas.isPending}
            onClick={() =>
              salvarNotas.mutate({ userId: id, notas: notas ?? "" })
            }
          >
            {salvarNotas.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
        {notas === null ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Anotações internas sobre este usuário…"
            rows={3}
          />
        )}
      </div>

      {/* Timeline */}
      <div className="rounded-2xl bg-card p-5 shadow-card md:p-6">
        <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Linha do tempo
        </h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem eventos.</p>
        ) : (
          <ol className="relative space-y-5 border-l-2 border-ponto-entrada/30 pl-6">
            {timeline.map((item, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-ponto-entrada/15 text-ponto-entrada">
                  <item.icon className="h-3.5 w-3.5" />
                </span>
                <p className="text-sm font-semibold text-primary">
                  {item.titulo}
                </p>
                {item.descricao && (
                  <p className="text-xs text-muted-foreground">
                    {item.descricao}
                  </p>
                )}
                <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                  {formatDataHora(item.data)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Dialogs */}
      <EditProfileDialog
        perfil={{
          id: perfil.id,
          nome_completo: perfil.nome_completo,
          email: perfil.email,
          profissao: perfil.profissao,
          carga_horaria_diaria: perfil.carga_horaria_diaria,
        }}
        open={editarOpen}
        onOpenChange={setEditarOpen}
      />
      <GrantPremiumDialog
        userId={perfil.id}
        nome={perfil.nome_completo ?? undefined}
        open={premiarOpen}
        onOpenChange={setPremiarOpen}
      />
      <AdminConfirmDialog
        open={bloquearOpen}
        onOpenChange={setBloquearOpen}
        title={perfil.bloqueado ? "Desbloquear conta" : "Bloquear conta"}
        description={
          perfil.bloqueado
            ? "O usuário voltará a acessar o app normalmente."
            : "O usuário não conseguirá acessar o app até ser desbloqueado."
        }
        confirmLabel={perfil.bloqueado ? "Desbloquear" : "Bloquear"}
        destructive={!perfil.bloqueado}
        loading={toggleBloqueio.isPending}
        onConfirm={(motivo) =>
          toggleBloqueio.mutate(
            { userId: id, bloqueado: !perfil.bloqueado, motivo },
            {
              onSuccess: () => {
                setBloquearOpen(false);
                queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
              },
            },
          )
        }
      />
      <AdminConfirmDialog
        open={revogarId != null}
        onOpenChange={(v) => !v && setRevogarId(null)}
        title="Revogar premium"
        description="O acesso premium será removido imediatamente."
        confirmLabel="Revogar"
        destructive
        loading={revogar.isPending}
        onConfirm={(motivo) => {
          if (!revogarId) return;
          revogar.mutate(
            { premiumId: revogarId, motivo },
            { onSuccess: () => setRevogarId(null) },
          );
        }}
      />
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{valor}</dd>
    </div>
  );
}
