import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Crown,
  ShieldOff,
  Share2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDataCurta, formatDataHora } from "@/lib/admin";
import { formatTime } from "@/lib/ponto";
import {
  EmptyState,
  InitialsAvatar,
  PremiumBadge,
  TipoPill,
  CardSkeleton,
} from "@/components/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/usuarios/$id")({
  component: AdminUsuarioDetalhe,
});

function AdminUsuarioDetalhe() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [acao, setAcao] = useState<"grant" | "revoke" | null>(null);

  const { data: perfil, isLoading: lp } = useQuery({
    queryKey: ["admin-user", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: premium = [], isLoading: lpr } = useQuery({
    queryKey: ["admin-user-premium", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("premium_access")
        .select("id, motivo, valido_ate")
        .eq("user_id", id)
        .gt("valido_ate", new Date().toISOString())
        .order("valido_ate", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: registros = [], isLoading: lr } = useQuery({
    queryKey: ["admin-user-registros", id],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("ponto_registros")
        .select("id, tipo, data_hora")
        .eq("user_id", id)
        .gte("data_hora", since)
        .order("data_hora", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const tz = perfil?.timezone ?? "America/Sao_Paulo";
  const premiumAtivo = premium[0];

  function invalidarTudo() {
    queryClient.invalidateQueries({ queryKey: ["admin-user-premium", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-premium-active"] });
  }

  const grant = useMutation({
    mutationFn: async () => {
      const validoAte = new Date(Date.now() + 30 * 24 * 3600 * 1000);
      const { error } = await supabase.from("premium_access").insert({
        user_id: id,
        motivo: "admin_manual",
        valido_ate: validoAte.toISOString(),
      });
      if (error) throw error;
      return validoAte;
    },
    onSuccess: (validoAte) => {
      toast.success(`✓ Premium concedido até ${formatDataCurta(validoAte.toISOString())}`);
      invalidarTudo();
    },
    onError: () => toast.error("Erro ao executar ação. Tente novamente."),
  });

  const revoke = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("premium_access")
        .delete()
        .eq("user_id", id)
        .gt("valido_ate", new Date().toISOString());
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("✓ Premium revogado com sucesso");
      invalidarTudo();
    },
    onError: () => toast.error("Erro ao executar ação. Tente novamente."),
  });

  const acting = grant.isPending || revoke.isPending;
  const registros30 = useMemo(() => registros, [registros]);

  if (lp) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton />
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

      {/* Cabeçalho de perfil */}
      <div className="rounded-2xl bg-card p-5 shadow-card md:p-6">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 sm:flex sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <InitialsAvatar
              name={perfil.nome_completo}
              email={perfil.email}
              size={56}
            />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-primary">
                {perfil.nome_completo || "Sem nome"}
              </h1>
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
          <div className="col-span-2 shrink-0">
            <PremiumBadge validoAte={premiumAtivo?.valido_ate} />
          </div>
        </div>
      </div>

      {/* Dados do perfil + Indicações */}
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
        </div>
      </div>

      {/* Premium e ações */}
      <div className="rounded-2xl bg-card p-5 shadow-card md:p-6">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Acesso Premium
        </h2>

        {lpr ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : premiumAtivo ? (
          <div className="rounded-xl bg-ponto-entrada/10 px-4 py-3">
            <p className="text-sm font-semibold text-ponto-entrada">
              Premium ativo
            </p>
            <p className="text-xs text-muted-foreground">
              Motivo{" "}
              <span className="font-medium text-foreground">
                {premiumAtivo.motivo}
              </span>{" "}
              · válido até{" "}
              <span className="font-medium text-foreground">
                {formatDataHora(premiumAtivo.valido_ate)}
              </span>
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-muted px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Sem acesso premium ativo.
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            onClick={() => setAcao("grant")}
            disabled={acting}
            className="bg-ponto-entrada text-ponto-entrada-foreground hover:bg-ponto-entrada/90"
          >
            {grant.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crown className="h-4 w-4" />
            )}
            Conceder 30 dias Premium
          </Button>
          <Button
            variant="outline"
            onClick={() => setAcao("revoke")}
            disabled={acting || !premiumAtivo}
            className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {revoke.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldOff className="h-4 w-4" />
            )}
            Revogar Premium
          </Button>
        </div>
      </div>

      {/* Histórico 30 dias */}
      <div className="rounded-2xl bg-card p-5 shadow-card md:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <Clock className="h-4 w-4" /> Registros (últimos 30 dias)
        </h2>
        {lr ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-6 animate-pulse rounded-md bg-primary/10"
              />
            ))}
          </div>
        ) : registros30.length === 0 ? (
          <EmptyState title="Nenhuma batida nos últimos 30 dias" />
        ) : (
          <ul className="divide-y divide-border">
            {registros30.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <TipoPill tipo={r.tipo} />
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDataCurta(r.data_hora)}
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {formatTime(r.data_hora, tz)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={acao !== null} onOpenChange={(o) => !o && setAcao(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-primary">
              {acao === "grant" ? "Conceder Premium?" : "Revogar Premium?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {acao === "grant"
                ? "Serão concedidos 30 dias de acesso Premium a este usuário."
                : "O acesso Premium ativo deste usuário será removido imediatamente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={
                acao === "revoke"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-ponto-entrada text-ponto-entrada-foreground hover:bg-ponto-entrada/90"
              }
              onClick={() => {
                if (acao === "grant") grant.mutate();
                if (acao === "revoke") revoke.mutate();
                setAcao(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
