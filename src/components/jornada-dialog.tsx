import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useSalvarJornada } from "@/hooks/use-empresa-actions";
import {
  DIAS_SEMANA,
  TIPO_JORNADA_LABEL,
  type JornadaEmpresa,
  type TipoJornada,
} from "@/lib/empresas";

type DiaState = { entrada: string; saida: string; intervalo: string };

function initDias(j?: JornadaEmpresa | null): Record<string, DiaState> {
  const out: Record<string, DiaState> = {};
  for (const d of DIAS_SEMANA) {
    const entrada = (j?.[`${d.key}_entrada` as keyof JornadaEmpresa] as
      | string
      | null) ?? "";
    const saida = (j?.[`${d.key}_saida` as keyof JornadaEmpresa] as
      | string
      | null) ?? "";
    const intervalo = j?.[`${d.key}_intervalo` as keyof JornadaEmpresa];
    out[d.key] = {
      entrada: entrada ? entrada.slice(0, 5) : "",
      saida: saida ? saida.slice(0, 5) : "",
      intervalo: intervalo != null ? String(intervalo) : "60",
    };
  }
  return out;
}

export function JornadaDialog({
  open,
  onOpenChange,
  empresaId,
  jornada,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  empresaId: string;
  jornada?: JornadaEmpresa | null;
}) {
  const salvar = useSalvarJornada();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoJornada>("fixo");
  const [dias, setDias] = useState<Record<string, DiaState>>(initDias());
  const [cargaSemanal, setCargaSemanal] = useState("44");
  const [folgas, setFolgas] = useState("1");
  const [escalaDesc, setEscalaDesc] = useState("");
  const [escalaTrab, setEscalaTrab] = useState("12");
  const [escalaFolga, setEscalaFolga] = useState("36");
  const [tolerancia, setTolerancia] = useState(5);
  const [heDiaUtil, setHeDiaUtil] = useState("50");
  const [heFeriado, setHeFeriado] = useState("100");
  const [noturno, setNoturno] = useState(false);
  const [banco, setBanco] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome(jornada?.nome ?? "");
    setTipo((jornada?.tipo as TipoJornada) ?? "fixo");
    setDias(initDias(jornada));
    setCargaSemanal(String(jornada?.carga_semanal_horas ?? 44));
    setFolgas(String(jornada?.folgas_flexiveis_semana ?? 1));
    setEscalaDesc(jornada?.escala_descricao ?? "");
    setEscalaTrab(String(jornada?.escala_horas_trabalho ?? 12));
    setEscalaFolga(String(jornada?.escala_horas_folga ?? 36));
    setTolerancia(jornada?.tolerancia_minutos ?? 5);
    setHeDiaUtil(String(jornada?.he_percentual_dia_util ?? 50));
    setHeFeriado(String(jornada?.he_percentual_feriado ?? 100));
    setNoturno(jornada?.adicional_noturno ?? false);
    setBanco(jornada?.banco_horas_ativo ?? false);
  }, [open, jornada]);

  function setDia(key: string, campo: keyof DiaState, valor: string) {
    setDias((prev) => ({ ...prev, [key]: { ...prev[key], [campo]: valor } }));
  }

  const mostraDias = tipo === "fixo" || tipo === "homeoffice";

  async function handleSalvar() {
    if (!nome.trim()) return;
    const valores: Record<string, unknown> = {
      empresa_id: empresaId,
      nome: nome.trim(),
      tipo,
      tolerancia_minutos: tolerancia,
      he_percentual_dia_util: Number(heDiaUtil) || 0,
      he_percentual_feriado: Number(heFeriado) || 0,
      adicional_noturno: noturno,
      banco_horas_ativo: banco,
    };

    if (mostraDias) {
      for (const d of DIAS_SEMANA) {
        const s = dias[d.key];
        valores[`${d.key}_entrada`] = s.entrada || null;
        valores[`${d.key}_saida`] = s.saida || null;
        valores[`${d.key}_intervalo`] = Number(s.intervalo) || 0;
      }
    } else if (tipo === "flexivel") {
      valores.carga_semanal_horas = Number(cargaSemanal) || 44;
      valores.folgas_flexiveis_semana = Number(folgas) || 0;
    } else if (tipo === "escala") {
      valores.escala_descricao = escalaDesc.trim() || null;
      valores.escala_horas_trabalho = Number(escalaTrab) || null;
      valores.escala_horas_folga = Number(escalaFolga) || null;
    }

    await salvar.mutateAsync({ id: jornada?.id, valores });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {jornada ? "Editar jornada" : "Nova jornada"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="jor-nome">Nome *</Label>
              <Input
                id="jor-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Administrativo 8h"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={tipo}
                onValueChange={(v) => setTipo(v as TipoJornada)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_JORNADA_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Jornada fixa / home office: grid de dias */}
          {mostraDias && (
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Horários por dia (em branco = folga)
              </Label>
              <div className="space-y-2">
                {DIAS_SEMANA.map((d) => (
                  <div
                    key={d.key}
                    className="grid grid-cols-[64px_1fr_1fr_72px] items-center gap-2"
                  >
                    <span className="text-sm font-medium">{d.curto}</span>
                    <Input
                      type="time"
                      value={dias[d.key].entrada}
                      onChange={(e) => setDia(d.key, "entrada", e.target.value)}
                      aria-label={`${d.label} entrada`}
                    />
                    <Input
                      type="time"
                      value={dias[d.key].saida}
                      onChange={(e) => setDia(d.key, "saida", e.target.value)}
                      aria-label={`${d.label} saída`}
                    />
                    <Input
                      type="number"
                      min={0}
                      value={dias[d.key].intervalo}
                      onChange={(e) =>
                        setDia(d.key, "intervalo", e.target.value)
                      }
                      aria-label={`${d.label} intervalo`}
                      title="Intervalo (min)"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Colunas: entrada · saída · intervalo (min)
              </p>
            </div>
          )}

          {/* Jornada flexível */}
          {tipo === "flexivel" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="jor-carga">Carga semanal (horas)</Label>
                <Input
                  id="jor-carga"
                  type="number"
                  min={0}
                  value={cargaSemanal}
                  onChange={(e) => setCargaSemanal(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jor-folgas">Folgas flexíveis / semana</Label>
                <Input
                  id="jor-folgas"
                  type="number"
                  min={0}
                  value={folgas}
                  onChange={(e) => setFolgas(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Escala */}
          {tipo === "escala" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="jor-esc">Descrição</Label>
                <Input
                  id="jor-esc"
                  value={escalaDesc}
                  onChange={(e) => setEscalaDesc(e.target.value)}
                  placeholder="12x36"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jor-esc-t">Horas trabalho</Label>
                <Input
                  id="jor-esc-t"
                  type="number"
                  min={0}
                  value={escalaTrab}
                  onChange={(e) => setEscalaTrab(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jor-esc-f">Horas folga</Label>
                <Input
                  id="jor-esc-f"
                  type="number"
                  min={0}
                  value={escalaFolga}
                  onChange={(e) => setEscalaFolga(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Parâmetros gerais */}
          <div className="space-y-4 rounded-xl bg-muted/40 p-4">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Parâmetros gerais
            </Label>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tolerância (min)</Label>
                <span className="text-sm font-semibold tabular-nums">
                  {tolerancia}
                </span>
              </div>
              <Slider
                min={0}
                max={10}
                step={1}
                value={[tolerancia]}
                onValueChange={(v) => setTolerancia(v[0])}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="jor-he-du">HE dia útil (%)</Label>
                <Input
                  id="jor-he-du"
                  type="number"
                  min={0}
                  value={heDiaUtil}
                  onChange={(e) => setHeDiaUtil(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jor-he-fe">HE feriado (%)</Label>
                <Input
                  id="jor-he-fe"
                  type="number"
                  min={0}
                  value={heFeriado}
                  onChange={(e) => setHeFeriado(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="jor-not">Adicional noturno</Label>
              <Switch
                id="jor-not"
                checked={noturno}
                onCheckedChange={setNoturno}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="jor-bh">Banco de horas</Label>
              <Switch id="jor-bh" checked={banco} onCheckedChange={setBanco} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={!nome.trim() || salvar.isPending}
          >
            {salvar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
