import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useRegistros } from "@/hooks/use-registros";
import { AppShell } from "@/components/app-shell";
import { MonthNav } from "@/routes/_authenticated/historico";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  agruparPorDia,
  diasDoMes,
  formatDuracao,
  formatSaldo,
  formatTime,
  nomeMes,
  resumoDoDia,
  zonedWallToUtc,
  type PontoRegistro,
} from "@/lib/ponto";

export const Route = createFileRoute("/_authenticated/relatorio")({
  head: () => ({ meta: [{ title: "Relatório — SINCRO" }] }),
  component: RelatorioPage,
});

function RelatorioPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
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

  const porDia = useMemo(() => {
    const mapa = new Map<string, PontoRegistro[]>();
    for (const grupo of agruparPorDia(registros, tz)) {
      mapa.set(grupo.dayKey, grupo.registros);
    }
    return mapa;
  }, [registros, tz]);

  const linhas = useMemo(() => {
    return diasDoMes(ano, mes).map((dayKey) => {
      const regs = porDia.get(dayKey) ?? [];
      const resumo = resumoDoDia(regs, carga);
      const completo = !!(resumo.entrada && resumo.saida);
      return { dayKey, resumo, completo, temRegistros: regs.length > 0 };
    });
  }, [ano, mes, porDia, carga]);

  const totais = useMemo(() => {
    let trabalhado = 0;
    let saldo = 0;
    for (const l of linhas) {
      if (l.completo) {
        trabalhado += l.resumo.trabalhadoMin;
        saldo += l.resumo.saldoMin;
      }
    }
    return { trabalhado, saldo };
  }, [linhas]);

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
      ["Data", "Entrada", "Saida Int.", "Entrada Int.", "Saida", "Total", "Saldo"],
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
          l.completo ? formatDuracao(r.trabalhadoMin) : hifen,
          l.completo ? formatSaldo(r.saldoMin) : hifen,
        ];
      }),
      [],
      ["Total trabalhado", formatDuracao(totais.trabalhado)],
      ["Saldo do mês", formatSaldo(totais.saldo)],
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

  return (
    <AppShell profile={profile ?? null}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Espelho de ponto</h1>
          <Button
            size="sm"
            variant="outline"
            onClick={exportarCSV}
            className="rounded-full"
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>

        <MonthNav
          label={nomeMes(ano, mes)}
          onPrev={() => navegar(-1)}
          onNext={() => navegar(1)}
        />

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/50 text-muted-foreground">
                    <th className="px-2 py-2 text-left font-semibold">Dia</th>
                    <th className="px-1.5 py-2 text-center font-semibold">Ent</th>
                    <th className="px-1.5 py-2 text-center font-semibold">
                      S.Int
                    </th>
                    <th className="px-1.5 py-2 text-center font-semibold">
                      E.Int
                    </th>
                    <th className="px-1.5 py-2 text-center font-semibold">Saí</th>
                    <th className="px-1.5 py-2 text-center font-semibold">
                      Total
                    </th>
                    <th className="px-2 py-2 text-right font-semibold">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => {
                    const r = l.resumo;
                    const dia = Number(l.dayKey.split("-")[2]);
                    return (
                      <tr
                        key={l.dayKey}
                        className={cn(
                          "border-b border-border/60 last:border-0 tabular-nums",
                          !l.temRegistros && "text-muted-foreground/60",
                        )}
                      >
                        <td className="px-2 py-2 text-left font-medium">
                          {String(dia).padStart(2, "0")}
                        </td>
                        <td className="px-1.5 py-2 text-center">
                          {r.entrada ? formatTime(r.entrada.data_hora, tz) : "·"}
                        </td>
                        <td className="px-1.5 py-2 text-center">
                          {r.saidaIntervalo
                            ? formatTime(r.saidaIntervalo.data_hora, tz)
                            : "·"}
                        </td>
                        <td className="px-1.5 py-2 text-center">
                          {r.entradaIntervalo
                            ? formatTime(r.entradaIntervalo.data_hora, tz)
                            : "·"}
                        </td>
                        <td className="px-1.5 py-2 text-center">
                          {r.saida ? formatTime(r.saida.data_hora, tz) : "·"}
                        </td>
                        <td className="px-1.5 py-2 text-center font-medium">
                          {l.completo ? formatDuracao(r.trabalhadoMin) : "·"}
                        </td>
                        <td
                          className={cn(
                            "px-2 py-2 text-right font-semibold",
                            l.completo &&
                              (r.saldoMin >= 0
                                ? "text-positivo"
                                : "text-negativo"),
                          )}
                        >
                          {l.completo ? formatSaldo(r.saldoMin) : "·"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-secondary/50 font-bold">
                    <td colSpan={5} className="px-2 py-3 text-left">
                      Total do mês
                    </td>
                    <td className="px-1.5 py-3 text-center tabular-nums">
                      {formatDuracao(totais.trabalhado)}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-3 text-right tabular-nums",
                        totais.saldo >= 0 ? "text-positivo" : "text-negativo",
                      )}
                    >
                      {formatSaldo(totais.saldo)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <p className="px-1 text-center text-xs leading-relaxed text-muted-foreground">
          Relatório gerado com base nos registros inseridos por você. O SINCRO
          não valida nem certifica os dados.
        </p>
      </div>
    </AppShell>
  );
}
