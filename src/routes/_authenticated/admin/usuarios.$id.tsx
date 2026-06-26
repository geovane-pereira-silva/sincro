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
import { mensagemErro } from "@/lib/erros";
import { formatDataCurta, formatDataHora } from "@/lib/admin";
import { TIPO_INFO, formatTime, type Tipo } from "@/lib/ponto";
import { cn } from "@/lib/utils";

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
    },
    onSuccess: () => {
      toast.success("✓ 30 dias de Premium concedidos");
      invalidarTudo();
    },
    onError: (err) => toast.error(mensagemErro(err)),
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
      toast.success("Premium revogado");
      invalidarTudo();
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const acting = grant.isPending || revoke.isPending;

  const registros30 = useMemo(() => registros, [registros]);

  if (lp) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-muted-foreground">Usuário não encontrado.</p>
        <Link to="/admin/usuarios" className="text-sm font-semibold text-ponto-entrada">
          Voltar à lista
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/usuarios"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Usuários
      </Link>

      {/* Cabeçalho */}
      <div className="rounded-2xl bg-card p-5 shadow-card md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-primary">
              {perfil.nome_completo || "Sem nome"}
            </h1>
            <p className="text-sm text-muted-foreground">{perfil.email}</p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold",
              premiumAtivo
                ? "bg-ponto-entrada/15 text-ponto-entrada"
                : "bg-muted text-muted-foreground",
            )}
          >
            {premiumAtivo
              ? `Premium até ${formatDataCurta(premiumAtivo.valido_ate)}`
              : "Gratuito"}
          </span>
        </div>
      </div>

      {/* Dados do perfil */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
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
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
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
          <p className="mt-4 text-xs text-muted-foreground">Código de indicação</p>
          <p className="font-mono text-base font-bold tracking-wider text-primary">
            {perfil.referral_code || "—"}
          </p>
        </div>
      </div>

      {/* Premium e ações */}
      <div className="rounded-2xl bg-card p-5 shadow-card md:p-6">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Acesso Premium
        </h2>
        {lpr ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : premiumAtivo ? (
          <p className="text-sm text-foreground">
            Ativo — motivo <span className="font-semibold">{premiumAtivo.motivo}</span>,
            válido até{" "}
            <span className="font-semibold">
              {formatDataHora(premiumAtivo.valido_ate)}
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sem acesso premium ativo.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            onClick={() => setAcao("grant")}
            disabled={acting}
            className="bg-ponto-entrada text-ponto-entrada-foreground hover:bg-ponto-entrada/90"
          >
            <Crown className="h-4 w-4" /> Conceder 30 dias Premium
          </Button>
          <Button
            variant="outline"
            onClick={() => setAcao("revoke")}
            disabled={acting || !premiumAtivo}
            className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <ShieldOff className="h-4 w-4" /> Revogar Premium
          </Button>
        </div>
      </div>

      {/* Histórico 30 dias */}
      <div className="rounded-2xl bg-card p-5 shadow-card md:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Clock className="h-4 w-4" /> Registros (últimos 30 dias)
        </h2>
        {lr ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : registros30.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum registro nos últimos 30 dias.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {registros30.map((r) => {
              const info = TIPO_INFO[r.tipo as Tipo];
              return (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className={cn("h-2.5 w-2.5 shrink-0 rounded-full", info?.dot)}
                  />
                  <span className="flex-1 text-sm text-foreground">
                    {info?.label ?? r.tipo}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDataCurta(r.data_hora)}
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {formatTime(r.data_hora, tz)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AlertDialog open={acao !== null} onOpenChange={(o) => !o && setAcao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar?</AlertDialogTitle>
            <AlertDialogDescription>
              {acao === "grant"
                ? "Conceder 30 dias de acesso Premium a este usuário."
                : "Revogar o acesso Premium ativo deste usuário."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-ponto-entrada text-ponto-entrada-foreground hover:bg-ponto-entrada/90"
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
