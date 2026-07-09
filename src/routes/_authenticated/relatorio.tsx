import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Loader2, FileText, Mail, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useRegistros } from "@/hooks/use-registros";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppShell } from "@/components/app-shell";
import { PontoDiaEditor } from "@/components/ponto-dia-editor";
import { MonthNav } from "@/routes/_authenticated/historico";
import { usePremium } from "@/components/premium-context";
import {
  LockedButton,
  LockedOverlay,
  UpsellBanner,
  UpsellGateCard,
} from "@/components/premium-gate";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useJornadaConfig } from "@/hooks/use-jornada-config";
import {
  calcularDia,
  formatBanco,
  formatHoraMin,
  JORNADA_CONFIG_DEFAULT,
  STATUS_INFO,
  type CalculoDia,
} from "@/lib/calculoTrabalhista";

import {
  agruparPorDia,
  batidasOrdenadas,
  colunasPonto,
  diasDoMes,
  formatDayKey,
  formatDuracao,
  formatSaldo,
  formatTime,
  nomeMes,
  resumoDoDia,
  rotuloBatida,
  rotuloBatidaCurto,
  zonedWallToUtc,
  type PontoRegistro,
  type Profile,
} from "@/lib/ponto";

export const Route = createFileRoute("/_authenticated/relatorio")({
  head: () => ({ meta: [{ title: "Relatório — SINCRO" }] }),
  component: RelatorioPage,
});

function RelatorioPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  return (
    <AppShell profile={profile ?? null}>
      <RelatorioConteudo user={user} profile={profile ?? null} />
    </AppShell>
  );
}

function RelatorioConteudo({
  user,
  profile,
}: {
  user: User | null;
  profile: Profile | null;
}) {
  const { isPremium, openUpsell } = usePremium();
  const { data: jornadaConfig } = useJornadaConfig(user?.id);
  const isMobile = useIsMobile();
  const tz = profile?.timezone ?? "America/Sao_Paulo";
  const carga = profile?.carga_horaria_diaria ?? 8;
  const config = jornadaConfig ?? JORNADA_CONFIG_DEFAULT;

  // Autônomos podem inserir/editar batidas manualmente pelo relatório.
  const isAutonomo =
    !profile?.tipo_conta || profile.tipo_conta === "autonomo";
  const [editorDay, setEditorDay] = useState<string | null>(null);

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

  // Mês anterior (usado no comparativo premium)
  const prevMes = mes === 1 ? 12 : mes - 1;
  const prevAno = mes === 1 ? ano - 1 : ano;
  const prev = useMemo(() => {
    const start = zonedWallToUtc(prevAno, prevMes, 1, 0, 0, 0, tz);
    const nMes = prevMes === 12 ? 1 : prevMes + 1;
    const nAno = prevMes === 12 ? prevAno + 1 : prevAno;
    const end = zonedWallToUtc(nAno, nMes, 1, 0, 0, 0, tz);
    return {
      fromIso: start.toISOString(),
      toIso: end.toISOString(),
      scope: `mes-${prevAno}-${prevMes}`,
    };
  }, [prevAno, prevMes, tz]);

  const { data: registrosPrev = [] } = useRegistros(
    isPremium ? user?.id : undefined,
    prev.fromIso,
    prev.toIso,
    prev.scope,
  );

  const porDia = useMemo(() => {
    const mapa = new Map<string, PontoRegistro[]>();
    for (const grupo of agruparPorDia(registros, tz)) {
      mapa.set(grupo.dayKey, grupo.registros);
    }
    return mapa;
  }, [registros, tz]);

  const linhas = useMemo(() => {
    let bhAcum = 0;
    return diasDoMes(ano, mes).map((dayKey) => {
      const regs = porDia.get(dayKey) ?? [];
      const resumo = resumoDoDia(regs, carga);
      const completo =
        !!(resumo.entrada && resumo.saida) && regs.length % 2 === 0;
      const [y, m, d] = dayKey.split("-").map(Number);
      const calc: CalculoDia = calcularDia({
        date: new Date(Date.UTC(y, m - 1, d, 12)),
        batidas: regs,
        config,
        cargaHorariaDiaria: carga,
        tz,
      });
      bhAcum += calc.bancoDia;
      // Horários de todas as batidas do dia, em ordem cronológica.
      const pontos = batidasOrdenadas(regs).map((r) => formatTime(r.data_hora, tz));
      return {
        dayKey,
        regs,
        resumo,
        completo,
        temRegistros: regs.length > 0,
        calc,
        bhAcumulado: bhAcum,
        pontos,
      };
    });
  }, [ano, mes, porDia, carga, config, tz]);

  // Nº de colunas de ponto a exibir (base 4, cresce até 10).
  const colsPontos = useMemo(
    () => colunasPonto(Math.max(0, ...linhas.map((l) => l.regs.length))),
    [linhas],
  );

  const totais = useMemo(() => {
    let trabalhado = 0;
    let previsto = 0;
    let saldo = 0;
    let extras = 0;
    let falta = 0;
    let atrasos = 0;
    let noturno = 0;
    let bh = 0;
    let diasTrabalhados = 0;
    let diasFolga = 0;
    let diasFalta = 0;
    for (const l of linhas) {
      previsto += l.calc.horasPrevistas;
      extras += l.calc.horasExtras;
      falta += l.calc.horasFalta;
      atrasos += l.calc.atraso;
      noturno += l.calc.adicionalNoturno;
      bh += l.calc.bancoDia;
      if (l.completo) {
        trabalhado += l.resumo.trabalhadoMin;
        saldo += l.resumo.saldoMin;
      }
      if (l.calc.status === "folga" || l.calc.status === "feriado") diasFolga++;
      else if (l.calc.status === "falta") diasFalta++;
      else if (l.temRegistros) diasTrabalhados++;
    }
    return {
      trabalhado,
      previsto,
      saldo,
      extras,
      falta,
      atrasos,
      noturno,
      bh,
      diasTrabalhados,
      diasFolga,
      diasFalta,
    };
  }, [linhas]);

  const totalPrev = useMemo(() => {
    let trabalhado = 0;
    for (const grupo of agruparPorDia(registrosPrev, tz)) {
      const resumo = resumoDoDia(grupo.registros, carga);
      if (resumo.entrada && resumo.saida) trabalhado += resumo.trabalhadoMin;
    }
    return trabalhado;
  }, [registrosPrev, tz, carga]);

  const maxMin = useMemo(
    () => Math.max(1, ...linhas.map((l) => (l.completo ? l.resumo.trabalhadoMin : 0))),
    [linhas],
  );

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

  function exportarCSV() {
    const hifen = "-";
    const linhasCSV = [
      [
        "Data",
        "Entrada",
        "Saida Int.",
        "Entrada Int.",
        "Saida",
        "Previsto",
        "Trabalhado",
        "Extra",
        "Falta",
        "Atraso",
        "BH dia",
        "BH acumulado",
        "Status",
      ],
      ...linhas.map((l) => {
        const r = l.resumo;
        return [
          l.dayKey,
          r.entrada ? formatTime(r.entrada.data_hora, tz) : hifen,
          r.saidaIntervalo ? formatTime(r.saidaIntervalo.data_hora, tz) : hifen,
          r.entradaIntervalo
            ? formatTime(r.entradaIntervalo.data_hora, tz)
            : hifen,
          r.saida ? formatTime(r.saida.data_hora, tz) : hifen,
          formatHoraMin(l.calc.horasPrevistas),
          l.completo ? formatHoraMin(l.calc.horasTrabalhadas) : hifen,
          l.calc.horasExtras > 0 ? formatHoraMin(l.calc.horasExtras) : hifen,
          l.calc.horasFalta > 0 ? formatHoraMin(l.calc.horasFalta) : hifen,
          l.calc.atraso > 0 ? formatHoraMin(l.calc.atraso) : hifen,
          config.banco_horas_ativo ? formatBanco(l.calc.bancoDia) : hifen,
          config.banco_horas_ativo ? formatBanco(l.bhAcumulado) : hifen,
          STATUS_INFO[l.calc.status].label,
        ];
      }),
      [],
      ["Total previsto", formatDuracao(totais.previsto)],
      ["Total trabalhado", formatDuracao(totais.trabalhado)],
      ["Total extras", formatDuracao(totais.extras)],
      ["Total falta", formatDuracao(totais.falta)],
      ["Total atrasos", formatDuracao(totais.atrasos)],
      ["Saldo do mês", formatSaldo(totais.saldo)],
      ...(config.banco_horas_ativo
        ? [["Saldo banco de horas do mês", formatBanco(totais.bh)]]
        : []),
      ...(config.adicional_noturno
        ? [["Adicional noturno total", formatHoraMin(totais.noturno)]]
        : []),
      ["Dias trabalhados", String(totais.diasTrabalhados)],
      ["Dias de folga/feriado", String(totais.diasFolga)],
      ["Dias de falta", String(totais.diasFalta)],
      [],
      [
        `Documento gerado pelo usuário via SINCRO. Responsabilidade pelos dados: ${
          profile?.nome_completo || profile?.email || "usuário"
        }.`,
      ],
    ];
    const csv = linhasCSV
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sincro-${ano}-${String(mes).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado.");
  }

  // Ações premium (habilitadas apenas para assinantes)
  function exportarPDF() {
    toast.success("Preparando PDF… use 'Salvar como PDF' na janela de impressão.");
    setTimeout(() => window.print(), 300);
  }

  function enviarEmail() {
    const assunto = `Espelho de ponto SINCRO — ${nomeMes(ano, mes)}`;
    const corpo = [
      `Espelho de ponto — ${nomeMes(ano, mes)}`,
      `Total trabalhado: ${formatDuracao(totais.trabalhado)}`,
      `Saldo do mês: ${formatSaldo(totais.saldo)}`,
      "",
      "Gerado via SINCRO.",
    ].join("\n");
    window.location.href = `mailto:?subject=${encodeURIComponent(
      assunto,
    )}&body=${encodeURIComponent(corpo)}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-foreground">Espelho de ponto</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={exportarCSV}
            className="rounded-full"
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
          {isPremium ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={exportarPDF}
                className="rounded-full"
              >
                <FileText className="h-4 w-4" />
                PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={enviarEmail}
                className="rounded-full"
              >
                <Mail className="h-4 w-4" />
                E-mail
              </Button>
            </>
          ) : (
            <>
              <LockedButton feature="o relatório em PDF" icon={<FileText className="h-4 w-4" />}>
                PDF
              </LockedButton>
              <LockedButton feature="o envio por e-mail" icon={<Mail className="h-4 w-4" />}>
                E-mail
              </LockedButton>
            </>
          )}
        </div>
      </div>

      {!isPremium && (
        <UpsellBanner
          texto="Precisa de relatório em PDF com sua assinatura? Desbloqueie o SINCRO Premium →"
          actionLabel="Ver como desbloquear"
          onAction={() => openUpsell("o relatório em PDF")}
        />
      )}

      <MonthNav
        label={nomeMes(ano, mes)}
        onPrev={() => navegar(-1)}
        onNext={() => navegar(1)}
      />

      {!isLoading && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ResumoCard label="Trabalhado" valor={formatHoraMin(totais.trabalhado)} />
          <ResumoCard label="Previsto" valor={formatHoraMin(totais.previsto)} />
          <ResumoCard
            label="Extras"
            valor={formatHoraMin(totais.extras)}
            classe="text-ponto-entrada"
          />
          <ResumoCard
            label="Falta"
            valor={formatHoraMin(totais.falta)}
            classe="text-negativo"
          />
          <ResumoCard label="Atrasos" valor={formatHoraMin(totais.atrasos)} />

          {config.banco_horas_ativo && (
            <ResumoCard
              label="Banco de horas (mês)"
              valor={formatBanco(totais.bh)}
              classe={totais.bh >= 0 ? "text-positivo" : "text-negativo"}
            />
          )}
          {config.adicional_noturno && (
            <ResumoCard
              label="Adicional noturno"
              valor={formatHoraMin(totais.noturno)}
            />
          )}
          <ResumoCard
            label="Dias trab. / folga / falta"
            valor={`${totais.diasTrabalhados}/${totais.diasFolga}/${totais.diasFalta}`}
          />
        </div>
      )}


      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isMobile ? (
        /* ---------- Layout mobile: cartões empilhados (sem rolagem lateral) ---------- */
        <div className="space-y-2">
          {isAutonomo && (
            <p className="px-1 text-xs text-muted-foreground">
              Toque em um dia para adicionar ou ajustar as batidas.
            </p>
          )}
          {linhas.map((l) => {
            const r = l.resumo;
            const st = STATUS_INFO[l.calc.status];
            const clickable = isAutonomo;
            return (
              <div
                key={l.dayKey}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => setEditorDay(l.dayKey) : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setEditorDay(l.dayKey);
                        }
                      }
                    : undefined
                }
                className={cn(
                  "rounded-2xl border border-border bg-card p-3 shadow-sm",
                  clickable && "cursor-pointer active:scale-[0.99] transition",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold capitalize text-foreground">
                    {formatDayKey(l.dayKey)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        st.classes,
                      )}
                    >
                      {st.label}
                    </span>
                    {clickable &&
                      (l.temRegistros ? (
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Plus className="h-4 w-4 text-primary" />
                      ))}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-1.5 text-center tabular-nums">
                  <PunchCell label="Entrada" hora={r.entrada && formatTime(r.entrada.data_hora, tz)} />
                  <PunchCell label="Saí int." hora={r.saidaIntervalo && formatTime(r.saidaIntervalo.data_hora, tz)} />
                  <PunchCell label="Volta" hora={r.entradaIntervalo && formatTime(r.entradaIntervalo.data_hora, tz)} />
                  <PunchCell label="Saída" hora={r.saida && formatTime(r.saida.data_hora, tz)} />
                </div>

                <div className="mt-3 grid grid-cols-4 gap-1.5 text-center tabular-nums">
                  <MiniMetric label="Prev" valor={l.calc.horasPrevistas > 0 ? formatHoraMin(l.calc.horasPrevistas) : "·"} />
                  <MiniMetric label="Trab" valor={l.completo ? formatHoraMin(l.calc.horasTrabalhadas) : "·"} />
                  <MiniMetric
                    label="Extra"
                    valor={l.calc.horasExtras > 0 ? formatHoraMin(l.calc.horasExtras) : "·"}
                    classe="text-ponto-entrada"
                  />
                  <MiniMetric
                    label="Falta"
                    valor={l.calc.horasFalta > 0 ? formatHoraMin(l.calc.horasFalta) : "·"}
                    classe="text-negativo"
                  />
                </div>

                {config.banco_horas_ativo && (
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-center tabular-nums">
                    <MiniMetric
                      label="BH dia"
                      valor={l.temRegistros || l.calc.bancoDia !== 0 ? formatBanco(l.calc.bancoDia) : "·"}
                      classe={l.calc.bancoDia >= 0 ? "text-positivo" : "text-negativo"}
                    />
                    <MiniMetric
                      label="BH acum."
                      valor={formatBanco(l.bhAcumulado)}
                      classe={l.bhAcumulado >= 0 ? "text-positivo" : "text-negativo"}
                    />
                  </div>
                )}
              </div>
            );
          })}

          <div className="rounded-2xl border-2 border-border bg-secondary/40 p-3">
            <p className="text-sm font-bold text-foreground">Total do mês</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5 text-center tabular-nums">
              <MiniMetric label="Prev" valor={formatHoraMin(totais.previsto)} />
              <MiniMetric label="Trab" valor={formatHoraMin(totais.trabalhado)} />
              <MiniMetric label="Extra" valor={formatHoraMin(totais.extras)} classe="text-ponto-entrada" />
              <MiniMetric label="Falta" valor={formatHoraMin(totais.falta)} classe="text-negativo" />
            </div>
          </div>
        </div>
      ) : (
        /* ---------- Layout desktop: tabela ---------- */
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-muted-foreground">
                  <th className="px-2 py-2 text-left font-semibold">Dia</th>
                  <th className="px-1.5 py-2 text-center font-semibold">Ent</th>
                  <th className="px-1.5 py-2 text-center font-semibold">Saí</th>
                  <th className="px-1.5 py-2 text-center font-semibold">Prev</th>
                  <th className="px-1.5 py-2 text-center font-semibold">Trab</th>
                  <th className="px-1.5 py-2 text-center font-semibold">Extra</th>
                  <th className="px-1.5 py-2 text-center font-semibold">Falta</th>
                  <th className="px-1.5 py-2 text-center font-semibold">Atr</th>
                  {config.banco_horas_ativo && (
                    <>
                      <th className="px-1.5 py-2 text-center font-semibold">BH</th>
                      <th className="px-1.5 py-2 text-center font-semibold">BH ac.</th>
                    </>
                  )}
                  <th className="px-2 py-2 text-right font-semibold">Status</th>
                  {isAutonomo && <th className="px-2 py-2 text-right font-semibold" />}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const r = l.resumo;
                  const dia = Number(l.dayKey.split("-")[2]);
                  const st = STATUS_INFO[l.calc.status];
                  return (
                    <tr
                      key={l.dayKey}
                      onClick={isAutonomo ? () => setEditorDay(l.dayKey) : undefined}
                      className={cn(
                        "border-b border-border/60 last:border-0 tabular-nums",
                        !l.temRegistros && "text-muted-foreground/60",
                        isAutonomo && "cursor-pointer hover:bg-secondary/40",
                      )}
                    >
                      <td className="px-2 py-2 text-left font-medium">
                        {String(dia).padStart(2, "0")}
                      </td>
                      <td className="px-1.5 py-2 text-center">
                        {r.entrada ? formatTime(r.entrada.data_hora, tz) : "·"}
                      </td>
                      <td className="px-1.5 py-2 text-center">
                        {r.saida ? formatTime(r.saida.data_hora, tz) : "·"}
                      </td>
                      <td className="px-1.5 py-2 text-center">
                        {l.calc.horasPrevistas > 0
                          ? formatHoraMin(l.calc.horasPrevistas)
                          : "·"}
                      </td>
                      <td className="px-1.5 py-2 text-center font-medium">
                        {l.completo ? formatHoraMin(l.calc.horasTrabalhadas) : "·"}
                      </td>
                      <td className="px-1.5 py-2 text-center text-ponto-entrada">
                        {l.calc.horasExtras > 0
                          ? formatHoraMin(l.calc.horasExtras)
                          : "·"}
                      </td>
                      <td className="px-1.5 py-2 text-center text-negativo">
                        {l.calc.horasFalta > 0
                          ? formatHoraMin(l.calc.horasFalta)
                          : "·"}
                      </td>
                      <td className="px-1.5 py-2 text-center">
                        {l.calc.atraso > 0 ? formatHoraMin(l.calc.atraso) : "·"}
                      </td>
                      {config.banco_horas_ativo && (
                        <>
                          <td
                            className={cn(
                              "px-1.5 py-2 text-center",
                              l.calc.bancoDia >= 0
                                ? "text-positivo"
                                : "text-negativo",
                            )}
                          >
                            {l.temRegistros || l.calc.bancoDia !== 0
                              ? formatBanco(l.calc.bancoDia)
                              : "·"}
                          </td>
                          <td
                            className={cn(
                              "px-1.5 py-2 text-center",
                              l.bhAcumulado >= 0
                                ? "text-positivo"
                                : "text-negativo",
                            )}
                          >
                            {formatBanco(l.bhAcumulado)}
                          </td>
                        </>
                      )}
                      <td className="px-2 py-2 text-right">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold",
                            st.classes,
                          )}
                        >
                          {st.label}
                        </span>
                      </td>
                      {isAutonomo && (
                        <td className="px-2 py-2 text-right">
                          {l.temRegistros ? (
                            <Pencil className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Plus className="ml-auto h-4 w-4 text-primary" />
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr
                  className="border-t-2 border-border font-bold"
                  style={{ backgroundColor: "#F8FAFC" }}
                >
                  <td colSpan={3} className="px-2 py-3 text-left">
                    Total do mês
                  </td>

                  <td className="px-1.5 py-3 text-center tabular-nums">
                    {formatHoraMin(totais.previsto)}
                  </td>
                  <td className="px-1.5 py-3 text-center tabular-nums">
                    {formatHoraMin(totais.trabalhado)}
                  </td>
                  <td className="px-1.5 py-3 text-center tabular-nums text-ponto-entrada">
                    {formatHoraMin(totais.extras)}
                  </td>
                  <td className="px-1.5 py-3 text-center tabular-nums text-negativo">
                    {formatHoraMin(totais.falta)}
                  </td>
                  <td className="px-1.5 py-3 text-center tabular-nums">
                    {formatHoraMin(totais.atrasos)}
                  </td>
                  {config.banco_horas_ativo && (
                    <>
                      <td
                        className={cn(
                          "px-1.5 py-3 text-center tabular-nums",
                          totais.bh >= 0 ? "text-positivo" : "text-negativo",
                        )}
                      >
                        {formatBanco(totais.bh)}
                      </td>
                      <td className="px-1.5 py-3" />
                    </>
                  )}
                  <td className="px-2 py-3" />
                  {isAutonomo && <td className="px-2 py-3" />}
                </tr>
              </tfoot>
            </table>

          </div>
        </div>
      )}

      {isAutonomo && editorDay && user && (
        <PontoDiaEditor
          open={!!editorDay}
          onOpenChange={(v) => !v && setEditorDay(null)}
          dayKey={editorDay}
          registros={linhas.find((l) => l.dayKey === editorDay)?.regs ?? []}
          userId={user.id}
          tz={tz}
        />
      )}


      {/* Gráfico mensal de produtividade */}
      {!isLoading && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-bold text-primary">
            Produtividade do mês
          </h2>
          {isPremium ? (
            <ProdutividadeChart linhas={linhas} maxMin={maxMin} />
          ) : (
            <LockedOverlay feature="os gráficos de produtividade">
              <ProdutividadeChart linhas={linhas} maxMin={maxMin} />
            </LockedOverlay>
          )}
        </section>
      )}

      {/* Comparativo entre meses */}
      {!isLoading && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-bold text-primary">
            Comparativo entre meses
          </h2>
          {isPremium ? (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {nomeMes(prevAno, prevMes)}
                  </p>
                  <p className="text-lg font-bold tabular-nums text-foreground">
                    {formatDuracao(totalPrev)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {nomeMes(ano, mes)}
                  </p>
                  <p className="text-lg font-bold tabular-nums text-foreground">
                    {formatDuracao(totais.trabalhado)}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-center text-xs font-semibold text-ponto-entrada">
                {totais.trabalhado >= totalPrev ? "▲" : "▼"}{" "}
                {formatDuracao(Math.abs(totais.trabalhado - totalPrev))} em relação
                ao mês anterior
              </p>
            </div>
          ) : (
            <UpsellGateCard
              feature="o comparativo entre meses"
              title="Comparativo entre meses é premium"
              description="Acompanhe sua evolução mês a mês desbloqueando o SINCRO Premium."
            />
          )}
        </section>
      )}

      {/* Espelho de ponto detalhado */}
      {!isLoading && !isPremium && (
        <UpsellGateCard
          feature="o espelho de ponto detalhado"
          title="Espelho detalhado é premium"
          description="Versão com foto, atestados e assinatura. Desbloqueie o SINCRO Premium."
        />
      )}

      <p className="px-1 text-center text-xs leading-relaxed text-muted-foreground">
        Relatório gerado com base nos registros inseridos por você. O SINCRO não
        valida nem certifica os dados.
      </p>
    </div>
  );
}

function ResumoCard({
  label,
  valor,
  classe,
}: {
  label: string;
  valor: string;
  classe?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-base font-bold tabular-nums text-foreground", classe)}>
        {valor}
      </p>
    </div>
  );
}

function PunchCell({ label, hora }: { label: string; hora?: string | false }) {
  return (
    <div className="rounded-lg bg-secondary/50 py-1.5">
      <p className="text-[10px] leading-tight text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">
        {hora || "·"}
      </p>
    </div>
  );
}

function MiniMetric({
  label,
  valor,
  classe,
}: {
  label: string;
  valor: string;
  classe?: string;
}) {
  return (
    <div>
      <p className="text-[10px] leading-tight text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-sm font-bold text-foreground", classe)}>
        {valor}
      </p>
    </div>
  );
}



function ProdutividadeChart({
  linhas,
  maxMin,
}: {
  linhas: { dayKey: string; completo: boolean; resumo: { trabalhadoMin: number } }[];
  maxMin: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex h-32 items-end gap-[2px]">
        {linhas.map((l) => {
          const min = l.completo ? l.resumo.trabalhadoMin : 0;
          const h = Math.round((min / maxMin) * 100);
          return (
            <div
              key={l.dayKey}
              className="flex-1 rounded-t-sm bg-ponto-entrada/70"
              style={{ height: `${Math.max(2, h)}%` }}
              title={`${l.dayKey}: ${formatDuracao(min)}`}
            />
          );
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Horas trabalhadas por dia
      </p>
    </div>
  );
}
