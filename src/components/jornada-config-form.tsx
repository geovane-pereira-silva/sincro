import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useJornadaConfig } from "@/hooks/use-jornada-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { mensagemErro } from "@/lib/erros";
import {
  parseHoraParaMinutos,
  type JornadaConfig,
} from "@/lib/calculoTrabalhista";

const DIAS: { key: string; label: string }[] = [
  { key: "seg", label: "Seg" },
  { key: "ter", label: "Ter" },
  { key: "qua", label: "Qua" },
  { key: "qui", label: "Qui" },
  { key: "sex", label: "Sex" },
  { key: "sab", label: "Sáb" },
  { key: "dom", label: "Dom" },
];

const INTERVALO_OPCOES: { value: string; label: string }[] = [
  { value: "0", label: "Sem intervalo" },
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "60", label: "1h" },
  { value: "90", label: "1h30" },
  { value: "120", label: "2h" },
];

function minutosParaHora(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function JornadaConfigForm({
  userId,
  cargaHorariaDiaria,
}: {
  userId: string | undefined;
  cargaHorariaDiaria: number;
}) {
  const { data: config, isLoading } = useJornadaConfig(userId);
  const queryClient = useQueryClient();

  const [dias, setDias] = useState<string[]>([]);
  const [entrada, setEntrada] = useState("08:00");
  const [saida, setSaida] = useState("17:00");
  const [saidaEditada, setSaidaEditada] = useState(false);
  const [intervalo, setIntervalo] = useState("60");
  const [tolerancia, setTolerancia] = useState(5);
  const [noturno, setNoturno] = useState(false);
  const [banco, setBanco] = useState(false);
  const [bancoLimite, setBancoLimite] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setDias(config.dias_trabalho);
      setEntrada(config.horario_entrada.slice(0, 5));
      setSaida(config.horario_saida.slice(0, 5));
      setIntervalo(String(config.intervalo_minutos));
      setTolerancia(config.tolerancia_minutos);
      setNoturno(config.adicional_noturno);
      setBanco(config.banco_horas_ativo);
      setBancoLimite(
        config.banco_horas_limite_horas != null
          ? String(config.banco_horas_limite_horas)
          : "",
      );
    }
  }, [config]);

  // Saída prevista sugerida = entrada + carga + intervalo (a menos que editada).
  const saidaSugerida = useMemo(() => {
    const base = parseHoraParaMinutos(entrada);
    const total = base + Math.round(cargaHorariaDiaria * 60) + Number(intervalo);
    return minutosParaHora(((total % (24 * 60)) + 24 * 60) % (24 * 60));
  }, [entrada, cargaHorariaDiaria, intervalo]);

  useEffect(() => {
    if (!saidaEditada) setSaida(saidaSugerida);
  }, [saidaSugerida, saidaEditada]);

  function toggleDia(key: string) {
    setDias((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key],
    );
  }

  async function handleSalvar() {
    if (!userId) return;
    setSaving(true);
    try {
      const payload: JornadaConfig & { user_id: string } = {
        user_id: userId,
        dias_trabalho: dias.length > 0 ? dias : ["seg", "ter", "qua", "qui", "sex"],
        horario_entrada: entrada,
        horario_saida: saida,
        intervalo_minutos: Number(intervalo),
        tolerancia_minutos: tolerancia,
        adicional_noturno: noturno,
        banco_horas_ativo: banco,
        banco_horas_limite_horas:
          banco && bancoLimite.trim() !== ""
            ? Number(bancoLimite.replace(",", "."))
            : null,
      };
      const { error } = await supabase
        .from("jornada_config")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      await queryClient.invalidateQueries({
        queryKey: ["jornada-config", userId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["banco-horas-registros", userId],
      });
      toast.success("Configuração de jornada salva.");
    } catch (err) {
      toast.error(mensagemErro(err));
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-card">
      {/* Dias de trabalho */}
      <div className="space-y-2">
        <Label>Dias de trabalho</Label>
        <div className="flex flex-wrap gap-2">
          {DIAS.map((d) => {
            const on = dias.includes(d.key);
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => toggleDia(d.key)}
                className={cn(
                  "h-10 w-12 rounded-xl text-sm font-semibold transition-colors",
                  on
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-secondary/50 text-muted-foreground hover:bg-secondary",
                )}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Horários */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ent">Entrada prevista</Label>
          <Input
            id="ent"
            type="time"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            className="tabular-nums"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sai">Saída prevista</Label>
          <Input
            id="sai"
            type="time"
            value={saida}
            onChange={(e) => {
              setSaida(e.target.value);
              setSaidaEditada(true);
            }}
            className="tabular-nums"
          />
        </div>
      </div>
      {!saidaEditada && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Calculada por entrada + carga ({cargaHorariaDiaria}h) + intervalo. Você
          pode editar.
        </p>
      )}

      {/* Intervalo mínimo */}
      <div className="space-y-1.5">
        <Label htmlFor="int">Intervalo mínimo</Label>
        <Select value={intervalo} onValueChange={setIntervalo}>
          <SelectTrigger id="int">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INTERVALO_OPCOES.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tolerância */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Tolerância</Label>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {tolerancia} min
          </span>
        </div>
        <Slider
          value={[tolerancia]}
          min={0}
          max={10}
          step={1}
          onValueChange={(v) => setTolerancia(v[0])}
        />
        <p className="text-xs text-muted-foreground">
          Portaria 671/2021, Art. 19 — padrão de 5 minutos.
        </p>
      </div>

      {/* Adicional noturno */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-3">
        <div>
          <p className="text-sm font-medium text-foreground">Adicional noturno</p>
          <p className="text-xs text-muted-foreground">
            {noturno ? "22:00 às 05:00 (CLT Art. 73)" : "Desligado"}
          </p>
        </div>
        <Switch checked={noturno} onCheckedChange={setNoturno} />
      </div>

      {/* Banco de horas */}
      <div className="space-y-3 rounded-xl border border-border bg-secondary/40 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Banco de horas</p>
            <p className="text-xs text-muted-foreground">
              {banco ? "Tipo simples — crédito/débito" : "Desligado"}
            </p>
          </div>
          <Switch checked={banco} onCheckedChange={setBanco} />
        </div>
        {banco && (
          <div className="space-y-1.5">
            <Label htmlFor="lim">Limite do banco (horas, opcional)</Label>
            <Input
              id="lim"
              type="number"
              min="0"
              step="1"
              placeholder="Ex.: 40"
              value={bancoLimite}
              onChange={(e) => setBancoLimite(e.target.value)}
            />
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={handleSalvar}
        disabled={saving}
        className="h-11 w-full rounded-xl font-semibold"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar jornada
      </Button>
    </div>
  );
}
