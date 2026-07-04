import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STATUS_INFO,
  formatBanco,
  formatHoraMin,
  type CalculoDia,
} from "@/lib/calculoTrabalhista";
import { formatTime } from "@/lib/ponto";

export function StatusDiaCard({
  calculo,
  tz,
}: {
  calculo: CalculoDia;
  tz: string;
}) {
  const [aberto, setAberto] = useState(false);
  const info = STATUS_INFO[calculo.status];
  const { batidas } = calculo;

  const entrada = batidas.find((b) => b.tipo === "entrada");
  const saida = [...batidas].reverse().find((b) => b.tipo === "saida");

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-5 py-4"
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold",
              info.classes,
            )}
          >
            {info.label}
          </span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {formatHoraMin(calculo.horasTrabalhadas)}
            <span className="text-muted-foreground">
              {" "}
              / {formatHoraMin(calculo.horasPrevistas)}
            </span>
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            aberto && "rotate-180",
          )}
        />
      </button>

      {aberto && (
        <div className="space-y-3 border-t border-border px-5 py-4 text-sm">
          <Linha
            label="Entrada"
            valor={entrada ? formatTime(entrada.data_hora, tz) : "—"}
          />
          <Linha
            label="Saída"
            valor={saida ? formatTime(saida.data_hora, tz) : "—"}
          />
          <Linha
            label="Intervalo"
            valor={`${formatHoraMin(calculo.intervaloRealizado)} / ${formatHoraMin(
              calculo.intervaloMinimo,
            )} mín.`}
            alerta={calculo.intervaloInsuficiente}
          />

          <div className="flex flex-wrap gap-2 pt-1">
            {calculo.horasExtras > 0 && (
              <Pill
                texto={`Extra ${formatHoraMin(calculo.horasExtras)}`}
                classes="bg-positivo/10 text-positivo"
              />
            )}
            {calculo.horasFalta > 0 && (
              <Pill
                texto={`Falta ${formatHoraMin(calculo.horasFalta)}`}
                classes="bg-negativo/10 text-negativo"
              />
            )}
            {calculo.atraso > 0 && (
              <Pill
                texto={`Atraso ${formatHoraMin(calculo.atraso)}`}
                classes="bg-ponto-saida-intervalo/10 text-ponto-saida-intervalo"
              />
            )}
            {calculo.saidaAntecipada > 0 && (
              <Pill
                texto={`Saída antec. ${formatHoraMin(calculo.saidaAntecipada)}`}
                classes="bg-ponto-saida-intervalo/10 text-ponto-saida-intervalo"
              />
            )}
            {calculo.config.adicional_noturno && calculo.minutosNoturnos > 0 && (
              <Pill
                texto={`Noturno ${formatHoraMin(calculo.minutosNoturnos)} (+${formatHoraMin(
                  calculo.adicionalNoturno,
                )})`}
                classes="bg-ponto-entrada-intervalo/10 text-ponto-entrada-intervalo"
              />
            )}
          </div>

          {calculo.config.banco_horas_ativo && (
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-muted-foreground">Banco de horas (dia)</span>
              <span
                className={cn(
                  "font-bold tabular-nums",
                  calculo.bancoDia >= 0 ? "text-positivo" : "text-negativo",
                )}
              >
                {formatBanco(calculo.bancoDia)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Linha({
  label,
  valor,
  alerta,
}: {
  label: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          alerta ? "text-negativo" : "text-foreground",
        )}
      >
        {valor}
      </span>
    </div>
  );
}

function Pill({ texto, classes }: { texto: string; classes: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", classes)}>
      {texto}
    </span>
  );
}
