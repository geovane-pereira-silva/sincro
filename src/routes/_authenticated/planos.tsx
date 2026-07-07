import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles, ShieldCheck, Star, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { CheckoutModal } from "@/components/checkout-modal";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { usePremium } from "@/components/premium-context";
import {
  PLANOS,
  BENEFICIOS_PREMIUM,
  fmtMoedaBR,
  type PlanoPago,
} from "@/lib/asaas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planos")({
  head: () => ({
    meta: [
      { title: "Planos Premium — SINCRO" },
      {
        name: "description",
        content:
          "Assine o SINCRO Premium: relatórios em PDF, histórico ilimitado, gráficos de produtividade e cálculo financeiro. A partir de R$ 9,99/mês.",
      },
    ],
  }),
  component: PlanosPage,
});

function PlanoCard({
  plano,
  onAssinar,
}: {
  plano: PlanoPago;
  onAssinar: (p: PlanoPago) => void;
}) {
  const info = PLANOS[plano];
  const anual = plano === "premium_anual";
  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col rounded-2xl border bg-card p-6 shadow-card",
        anual ? "border-ponto-entrada/40" : "border-border",
      )}
    >
      {anual ? (
        <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] px-3 py-1 text-[11px] font-bold text-[#3d2a00] shadow-sm">
          <Sparkles className="h-3 w-3" />
          {info.badge}
        </span>
      ) : (
        <span className="w-fit rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          {info.badge}
        </span>
      )}

      <div className="mt-4">
        <p className="text-sm font-semibold text-muted-foreground">
          {info.nome}
        </p>
        <p className="mt-1 flex items-baseline gap-1">
          <span className="text-3xl font-bold text-foreground">
            {fmtMoedaBR(info.valor)}
          </span>
          <span className="text-sm text-muted-foreground">
            {anual ? "/ano" : "/mês"}
          </span>
        </p>
        {anual && (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              equivale a {fmtMoedaBR(info.valorMensalEquivalente)}/mês
            </p>
            <p className="mt-1 text-sm font-semibold text-ponto-entrada">
              Economize {fmtMoedaBR(info.economiaAnual ?? 0)} por ano
            </p>
          </>
        )}
      </div>

      <ul className="mt-5 flex-1 space-y-2.5">
        {BENEFICIOS_PREMIUM.map((b) => (
          <li key={b} className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ponto-entrada/12">
              <Check className="h-3.5 w-3.5 text-ponto-entrada" />
            </span>
            <span className="text-sm text-foreground">{b}</span>
          </li>
        ))}
        {anual && (
          <li className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ponto-entrada/12">
              <Check className="h-3.5 w-3.5 text-ponto-entrada" />
            </span>
            <span className="text-sm font-semibold text-foreground">
              2 meses grátis
            </span>
          </li>
        )}
      </ul>

      <Button
        onClick={() => onAssinar(plano)}
        className={cn(
          "mt-6 h-12 w-full rounded-xl text-base font-semibold",
          anual
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-ponto-entrada text-ponto-entrada-foreground hover:bg-ponto-entrada/90",
        )}
      >
        {anual ? "Assinar anual" : "Assinar agora"}
      </Button>
    </div>
  );
}

function PlanosPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  return (
    <AppShell profile={profile ?? null}>
      <PlanosConteudo
        nomePadrao={profile?.nome_completo ?? ""}
        emailPadrao={profile?.email ?? user?.email ?? ""}
      />
    </AppShell>
  );
}

function PlanosConteudo({
  nomePadrao,
  emailPadrao,
}: {
  nomePadrao: string;
  emailPadrao: string;
}) {
  const { openUpsell } = usePremium();
  const [checkout, setCheckout] = useState<PlanoPago | null>(null);

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Escolha seu plano Premium
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Desbloqueie todos os recursos do SINCRO.
          </p>
        </header>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <PlanoCard plano="premium_mensal" onAssinar={setCheckout} />
          <PlanoCard plano="premium_anual" onAssinar={setCheckout} />
        </div>

        <button
          type="button"
          onClick={() => openUpsell()}
          className="mx-auto mt-6 flex items-center gap-1.5 text-sm font-medium text-ponto-entrada hover:underline"
        >
          <Users className="h-4 w-4" />
          Ou desbloqueie grátis indicando amigos →
        </button>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-ponto-entrada" />
            Pagamento seguro
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-4 w-4 text-ponto-entrada" />
            Cancele quando quiser
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="h-4 w-4 text-ponto-entrada" />
            Suporte por email
          </span>
        </div>
      </div>

      {checkout && (
        <CheckoutModal
          open={!!checkout}
          onOpenChange={(o) => !o && setCheckout(null)}
          plano={checkout}
          nomePadrao={nomePadrao}
          emailPadrao={emailPadrao}
        />
      )}
    </>
  );
}
