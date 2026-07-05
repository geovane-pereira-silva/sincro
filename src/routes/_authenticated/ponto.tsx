import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, Pencil, Flame } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useRegistros } from "@/hooks/use-registros";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { mensagemErro } from "@/lib/erros";
import { verificarRecompensasPremium } from "@/lib/premium";
import { HomeUpsellBanner } from "@/components/home-upsell-banner";
import { StatusDiaCard } from "@/components/status-dia-card";
import { JornadaOnboardingModal } from "@/components/jornada-onboarding-modal";

import { useJornadaConfig } from "@/hooks/use-jornada-config";
import { useBancoHoras } from "@/hooks/use-banco-horas";
import {
  calcularDia,
  formatBanco,
  formatHoraMin,
  JORNADA_CONFIG_DEFAULT,
} from "@/lib/calculoTrabalhista";
import {
  TIPO_INFO,
  calcularStreak,
  dayKeyInTz,
  formatDateLong,
  formatTime,
  getZonedParts,
  nextTipo,
  resumoDoDia,
  zonedWallToUtc,
} from "@/lib/ponto";

export const Route = createFileRoute("/_authenticated/ponto")({
  head: () => ({ meta: [{ title: "Meu Ponto — SINCRO" }] }),
  component: PontoPage,
});

function PontoPage() {
  const { user } = useAuth();
  const { data: profile, isLoading: loadingProfile } = useProfile(user?.id);
  const tz = profile?.timezone ?? "America/Sao_Paulo";
  const carga = profile?.carga_horaria_diaria ?? 8;

  const queryClient = useQueryClient();

  // Relógio em tempo real (segundos) — só o display do relógio.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Contador ao vivo de horas trabalhadas: recalcula a cada 30s (evita
  // re-renders/recalcs desnecessários a cada segundo).
  const [nowSlow, setNowSlow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNowSlow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);


  // Intervalo de "hoje" no fuso do usuário
  const { fromIso, toIso, hojeKey } = useMemo(() => {
    const p = getZonedParts(new Date(), tz);
    const start = zonedWallToUtc(p.year, p.month, p.day, 0, 0, 0, tz);
    const end = new Date(start.getTime() + 24 * 3600 * 1000);
    return {
      fromIso: start.toISOString(),
      toIso: end.toISOString(),
      hojeKey: `${p.year}-${p.month}-${p.day}`,
    };
  }, [tz]);

  const {
    data: registros = [],
    isLoading: loadingRegistros,
  } = useRegistros(user?.id, fromIso, toIso, `dia-${hojeKey}`);

  // Sequência de dias consecutivos (streak) — últimos 45 dias
  const { data: streakRegs = [] } = useQuery({
    queryKey: ["streak", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const since = new Date(
        Date.now() - 45 * 24 * 3600 * 1000,
      ).toISOString();
      const { data, error } = await supabase
        .from("ponto_registros")
        .select("data_hora")
        .eq("user_id", user!.id)
        .gte("data_hora", since);
      if (error) throw error;
      return data ?? [];
    },
  });

  const streak = useMemo(() => {
    const dias = new Set(
      streakRegs.map((r) => dayKeyInTz(new Date(r.data_hora), tz)),
    );
    return calcularStreak(dias, tz);
  }, [streakRegs, tz]);

  // Realtime: atualiza a lista quando novos registros chegam
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("ponto-hoje")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ponto_registros",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["registros", user.id, `dia-${hojeKey}`],
          });
          queryClient.invalidateQueries({ queryKey: ["streak", user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, hojeKey, queryClient]);

  // Campo de horário editável
  const [timeInput, setTimeInput] = useState("");
  const [isManual, setIsManual] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const focused = useRef(false);

  const horaAtual = useMemo(() => {
    const p = getZonedParts(now, tz);
    return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
  }, [now, tz]);

  useEffect(() => {
    if (!isManual && !focused.current) {
      setTimeInput(horaAtual);
    }
  }, [horaAtual, isManual]);

  const proximo = nextTipo(registros.length);
  const resumo = resumoDoDia(registros, carga);

  const { data: jornadaConfig } = useJornadaConfig(user?.id);
  const banco = useBancoHoras();

  const calculo = useMemo(
    () =>
      calcularDia({
        date: now,
        batidas: registros,
        config: jornadaConfig ?? JORNADA_CONFIG_DEFAULT,
        cargaHorariaDiaria: carga,
        tz,
      }),
    // `now` muda a cada segundo; só depende da data efetiva, não do relógio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registros, jornadaConfig, carga, tz],
  );

  // Contador ao vivo enquanto está no turno (após entrada, antes de saída).
  const emTurno = !!resumo.entrada && !resumo.saida;
  const trabalhadoAoVivoMin = useMemo(() => {
    if (!resumo.entrada) return 0;
    const inicio = new Date(resumo.entrada.data_hora).getTime();
    let intervalo = 0;
    if (resumo.saidaIntervalo && resumo.entradaIntervalo) {
      intervalo =
        (new Date(resumo.entradaIntervalo.data_hora).getTime() -
          new Date(resumo.saidaIntervalo.data_hora).getTime()) /
        60000;
    } else if (resumo.saidaIntervalo && !resumo.entradaIntervalo) {
      intervalo = (nowSlow.getTime() - new Date(resumo.saidaIntervalo.data_hora).getTime()) / 60000;
    }
    const fim = resumo.saida ? new Date(resumo.saida.data_hora).getTime() : nowSlow.getTime();
    return Math.max(0, (fim - inicio) / 60000 - Math.max(0, intervalo));
  }, [resumo, nowSlow]);


  const previstoMin = carga * 60;
  const faltaMin = previstoMin - trabalhadoAoVivoMin;

  const relogio = useMemo(() => {
    const p = getZonedParts(now, tz);
    return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}:${String(p.second).padStart(2, "0")}`;
  }, [now, tz]);

  const foiEditado = isManual && timeInput !== horaAtual && timeInput.length === 5;

  async function handleBater() {
    if (!user || !proximo) return;
    if (!/^\d{2}:\d{2}$/.test(timeInput)) {
      toast.error("Horário inválido.");
      return;
    }

    setSubmitting(true);
    try {
      const original = new Date();
      let dataHora: Date;
      if (isManual) {
        const [hh, mm] = timeInput.split(":").map(Number);
        const p = getZonedParts(original, tz);
        dataHora = zonedWallToUtc(p.year, p.month, p.day, hh, mm, 0, tz);
      } else {
        dataHora = original;
      }

      const editadoReal =
        Math.abs(dataHora.getTime() - original.getTime()) > 60000;
      const obs = justificativa.trim();

      const { error } = await supabase.from("ponto_registros").insert({
        user_id: user.id,
        tipo: proximo,
        data_hora: dataHora.toISOString(),
        data_hora_original: original.toISOString(),
        foi_editado: editadoReal,
        justificativa: editadoReal && obs.length > 0 ? obs : null,
        origem: "web",
      });
      if (error) throw error;

      toast.success(
        `✓ Registro confirmado pelo SINCRO às ${formatTime(dataHora.toISOString(), tz)}`,
      );
      setIsManual(false);
      setJustificativa("");
      setTimeInput(horaAtual);
      queryClient.invalidateQueries({
        queryKey: ["registros", user.id, `dia-${hojeKey}`],
      });
      queryClient.invalidateQueries({ queryKey: ["streak", user.id] });
      // Confere recompensas premium (ex.: 7 dias seguidos) após a batida.
      void verificarRecompensasPremium(user.id, queryClient);
    } catch (err) {
      toast.error(mensagemErro(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppShell profile={profile ?? null}>
      <JornadaOnboardingModal userId={user?.id} />
      <div className="space-y-6">

        {/* Relógio */}
        <div className="rounded-[20px] border border-border bg-card p-6 text-center shadow-card">
          <p className="font-mono text-[56px] font-bold leading-none tabular-nums tracking-tight text-primary">
            {relogio}
          </p>
          <p className="mt-2 text-sm lowercase first-letter:uppercase text-muted-foreground">
            {formatDateLong(now, tz)}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {streak >= 2 && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-semibold text-[#EA580C]">
                <Flame className="h-3.5 w-3.5" />
                {streak >= 7
                  ? `${streak} dias seguidos — você é consistente!`
                  : `${streak} dias seguidos`}
              </div>
            )}
            {banco.ativo && !banco.isLoading && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tabular-nums",
                  banco.saldoAtual >= 0
                    ? "bg-positivo/10 text-positivo"
                    : "bg-negativo/10 text-negativo",
                )}
              >
                BH: {banco.saldoFormatado}
              </span>
            )}
          </div>

          {emTurno && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {formatHoraMin(trabalhadoAoVivoMin)}
              </p>
              <p className="text-xs text-muted-foreground">
                {faltaMin > 0
                  ? `Faltam ${formatHoraMin(faltaMin)} para completar a jornada`
                  : `${formatHoraMin(-faltaMin)} de extra hoje`}
              </p>
            </div>
          )}
        </div>

        {/* Campo de horário editável */}
        <div className="space-y-2">
          <Label htmlFor="hora" className="text-xs text-muted-foreground/70">
            Horário do registro
          </Label>
          <Input
            id="hora"
            type="time"
            value={timeInput}
            onFocus={() => {
              focused.current = true;
            }}
            onBlur={() => {
              focused.current = false;
              if (timeInput.trim() === "") setIsManual(false);
            }}
            onChange={(e) => {
              const v = e.target.value;
              setTimeInput(v);
              setIsManual(v.trim() !== "");
            }}
            className="h-12 rounded-xl text-center text-2xl font-bold tabular-nums text-primary"
          />
          {foiEditado && (
            <div className="space-y-1.5 rounded-xl border border-border bg-secondary/50 p-3">
              <Label htmlFor="just" className="flex items-center gap-1.5 text-xs">
                <Pencil className="h-3.5 w-3.5" />
                Observação (opcional)
              </Label>
              <Textarea
                id="just"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Ex.: esqueci de bater na hora certa..."
                rows={2}
                className="resize-none bg-card"
              />
            </div>
          )}
        </div>

        {/* Botão principal — texto dinâmico por tipo de batida */}
        {proximo ? (
          <Button
            onClick={handleBater}
            disabled={submitting}
            className={cn(
              "h-16 w-full rounded-2xl text-lg font-bold transition-all",
              TIPO_INFO[proximo].colorClass,
            )}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              TIPO_INFO[proximo].botao
            )}
          </Button>
        ) : (
          <div className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl border border-ponto-entrada/30 bg-ponto-entrada/10 text-base font-semibold text-ponto-entrada">
            <Check className="h-5 w-5" />
            Jornada de hoje concluída
          </div>
        )}

        {/* Banner contextual de indicação (usuários gratuitos, +5 dias de uso) */}
        {profile && (
          <HomeUpsellBanner profile={profile} tz={tz} carga={carga} />
        )}





        {/* Status do dia — cálculo trabalhista completo. Expandido por padrão
            quando já há pelo menos uma batida no dia. */}
        {!loadingRegistros && registros.length > 0 && (
          <StatusDiaCard calculo={calculo} tz={tz} defaultAberto />
        )}


        {/* Batidas de hoje */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 text-sm font-bold text-primary">Batidas de hoje</h2>


          {loadingRegistros ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : registros.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma batida ainda. Comece registrando sua entrada.
            </p>
          ) : (
            <ul className="space-y-2">
              {registros.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2"
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
