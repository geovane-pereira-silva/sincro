import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, Pencil } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useRegistros } from "@/hooks/use-registros";
import { AppShell } from "@/components/app-shell";
import { usePremium } from "@/components/premium-context";
import { UpsellGateCard } from "@/components/premium-gate";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  TIPO_INFO,
  agruparPorDia,
  dayKeyInTz,
  formatDayKey,
  formatTime,
  formatDuracao,
  formatSaldo,
  nomeMes,
  resumoDoDia,
  zonedWallToUtc,
  type Profile,
} from "@/lib/ponto";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico — SINCRO" }] }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  return (
    <AppShell profile={profile ?? null}>
      <HistoricoConteudo user={user} profile={profile ?? null} />
    </AppShell>
  );
}

function HistoricoConteudo({
  user,
  profile,
}: {
  user: User | null;
  profile: Profile | null;
}) {
  const { isPremium } = usePremium();
  const tz = profile?.timezone ?? "America/Sao_Paulo";
  const carga = profile?.carga_horaria_diaria ?? 8;

  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);

  const { fromIso, toIso, scope } = useMemo(() => {
    const start = zonedWallToUtc(ano, mes, 1, 0, 0, 0, tz);
    const nextMes = mes === 12 ? 1 : mes + 1;
    const nextAno = mes === 12 ? ano + 1 : ano;
    const end = zonedWallToUtc(nextAno, nextMes, 1, 0, 0, 0, tz);
    return {
      fromIso: start.toISOString(),
      toIso: end.toISOString(),
      scope: `mes-${ano}-${mes}`,
    };
  }, [ano, mes, tz]);

  const { data: registros = [], isLoading } = useRegistros(
    user?.id,
    fromIso,
    toIso,
    scope,
  );

  const diasTodos = useMemo(
    () => agruparPorDia(registros, tz),
    [registros, tz],
  );

  // Tier gratuito: apenas os últimos 7 dias ficam visíveis.
  const cutoffKey = useMemo(
    () => dayKeyInTz(new Date(Date.now() - 6 * 24 * 3600 * 1000), tz),
    [tz],
  );

  const dias = useMemo(
    () =>
      isPremium ? diasTodos : diasTodos.filter((d) => d.dayKey >= cutoffKey),
    [isPremium, diasTodos, cutoffKey],
  );

  const temBloqueio = !isPremium && diasTodos.length > dias.length;

  function navegar(delta: number) {
    let m = mes + delta;
    let a = ano;
    if (m < 1) {
      m = 12;
      a -= 1;
    } else if (m > 12) {
      m = 1;
      a += 1;
    }
    setMes(m);
    setAno(a);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-foreground">Histórico</h1>

      <MonthNav
        label={nomeMes(ano, mes)}
        onPrev={() => navegar(-1)}
        onNext={() => navegar(1)}
      />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : dias.length === 0 && !temBloqueio ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma batida neste mês.
        </p>
      ) : (
        <>
          {dias.length > 0 && (
            <Accordion type="single" collapsible className="space-y-2">
              {dias.map(({ dayKey, registros: regs }) => {
                const resumo = resumoDoDia(regs, carga);
                return (
                  <AccordionItem
                    key={dayKey}
                    value={dayKey}
                    className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex w-full items-center justify-between pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold capitalize text-foreground">
                            {formatDayKey(dayKey)}
                          </span>
                          <div className="flex gap-1">
                            {regs.map((r) => (
                              <span
                                key={r.id}
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  TIPO_INFO[r.tipo].dot,
                                )}
                              />
                            ))}
                          </div>
                        </div>
                        {resumo.entrada && resumo.saida ? (
                          <span className="rounded-full bg-positivo/10 px-2.5 py-1 text-xs font-bold text-positivo">
                            {formatDuracao(resumo.trabalhadoMin)}
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3">
                      <ul className="space-y-1.5">
                        {regs.map((r) => (
                          <li key={r.id}>
                            <Link
                              to="/editar/$id"
                              params={{ id: r.id }}
                              className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2 transition-colors hover:bg-secondary"
                            >
                              <span
                                className={cn(
                                  "h-2.5 w-2.5 shrink-0 rounded-full",
                                  TIPO_INFO[r.tipo].dot,
                                )}
                              />
                              <span className="flex-1 text-sm text-foreground">
                                {TIPO_INFO[r.tipo].label}
                              </span>
                              {r.foi_editado && (
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                                {formatTime(r.data_hora, tz)}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {resumo.entrada && resumo.saida && (
                        <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs">
                          <span className="text-muted-foreground">
                            Intervalo: {formatDuracao(resumo.intervaloMin)}
                          </span>
                          <span
                            className={cn(
                              "font-bold",
                              resumo.saldoMin >= 0
                                ? "text-positivo"
                                : "text-negativo",
                            )}
                          >
                            Saldo {formatSaldo(resumo.saldoMin)}
                          </span>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}

          {temBloqueio && (
            <UpsellGateCard
              feature="o histórico completo"
              title="Histórico completo é premium"
              description="No plano gratuito você vê os últimos 7 dias. Desbloqueie o histórico ilimitado do SINCRO."
            />
          )}
        </>
      )}
    </div>
  );
}

export function MonthNav({
  label,
  onPrev,
  onNext,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-full border border-border bg-card p-1.5 shadow-sm">
      <button
        onClick={onPrev}
        aria-label="Mês anterior"
        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="text-sm font-semibold lowercase first-letter:uppercase text-foreground">
        {label}
      </span>
      <button
        onClick={onNext}
        aria-label="Próximo mês"
        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
