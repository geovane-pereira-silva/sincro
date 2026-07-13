import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { mensagemErro } from "@/lib/erros";
import {
  batidasOrdenadas,
  getZonedParts,
  zonedWallToUtc,
  formatDayKey,
  rotuloBatida,
  type PontoRegistro,
  type Tipo,
} from "@/lib/ponto";

const MAX_PONTOS = 10;

// Tipo (papel) de uma batida pela sua posição na sequência do dia.
function tipoPorPosicao(index: number, total: number): Tipo {
  if (index === 0) return "entrada";
  if (index === total - 1) return "saida";
  return index % 2 === 1 ? "saida_intervalo" : "entrada_intervalo";
}

/**
 * Editor de batidas de um dia inteiro para usuários autônomos.
 * Mostra 4 pontos por padrão e permite adicionar intervalos até 10 pontos.
 * Registros nunca são apagados — deixar em branco apenas não cria a batida.
 */
export function PontoDiaEditor({
  open,
  onOpenChange,
  dayKey,
  registros,
  userId,
  tz,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dayKey: string;
  registros: PontoRegistro[];
  userId: string;
  tz: string;
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [count, setCount] = useState(4);
  const [values, setValues] = useState<string[]>(["", "", "", ""]);

  // Batidas existentes mapeadas por papel/posição, em ordem cronológica.
  const existentesPorSlot = useMemo(() => {
    const ordenados = batidasOrdenadas(registros);
    const entrada = registros.find((r) => r.tipo === "entrada");
    const saida = [...registros].reverse().find((r) => r.tipo === "saida");
    const outs = ordenados.filter((r) => r.tipo === "saida_intervalo");
    const ins = ordenados.filter((r) => r.tipo === "entrada_intervalo");
    return { entrada, saida, outs, ins };
  }, [registros]);

  function regDoSlot(
    i: number,
    total: number,
    e = existentesPorSlot,
  ): PontoRegistro | undefined {
    if (i === 0) return e.entrada;
    if (i === total - 1) return e.saida;
    return i % 2 === 1 ? e.outs[(i - 1) / 2] : e.ins[(i - 2) / 2];
  }

  useEffect(() => {
    if (!open) return;
    const paresPresentes = Math.max(
      existentesPorSlot.outs.length,
      existentesPorSlot.ins.length,
    );
    // Base 4 (1 par de intervalo), cresce conforme o que já foi registrado.
    const total = Math.min(
      MAX_PONTOS,
      Math.max(4, 2 + 2 * Math.max(1, paresPresentes)),
    );
    const next: string[] = [];
    for (let i = 0; i < total; i++) {
      const reg = regDoSlot(i, total);
      if (reg) {
        const p = getZonedParts(new Date(reg.data_hora), tz);
        next.push(
          `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`,
        );
      } else {
        next.push("");
      }
    }
    setCount(total);
    setValues(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dayKey]);

  const [y, m, d] = dayKey.split("-").map(Number);

  function addIntervalo() {
    if (count >= MAX_PONTOS) return;
    // Insere um par de intervalo antes da saída (mantém a saída por último).
    setValues((v) => {
      const arr = [...v];
      const saida = arr[arr.length - 1];
      arr.splice(arr.length - 1, 1, "", "", saida);
      return arr;
    });
    setCount((c) => Math.min(MAX_PONTOS, c + 2));
  }

  function removeIntervalo(idx: number) {
    // Remove o par de intervalo (idx = saída int.; idx+1 = volta int.).
    setValues((v) => {
      const arr = [...v];
      arr.splice(idx, 2);
      return arr;
    });
    setCount((c) => Math.max(4, c - 2));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. Coleta todas as batidas preenchidas com seu horário real (minutos).
      const preenchidas: {
        raw: string;
        minutos: number;
        iso: string;
        existente?: PontoRegistro;
      }[] = [];

      for (let i = 0; i < count; i++) {
        const raw = values[i].trim();
        if (!raw) continue; // vazio: nada a fazer (não apaga registros)
        if (!/^\d{2}:\d{2}$/.test(raw)) {
          toast.error(`Horário inválido em ${rotuloBatida(i, count)}.`);
          setSaving(false);
          return;
        }
        const [hh, mm] = raw.split(":").map(Number);
        if (hh > 23 || mm > 59) {
          toast.error(`Horário inválido em ${rotuloBatida(i, count)}.`);
          setSaving(false);
          return;
        }
        const iso = zonedWallToUtc(y, m, d, hh, mm, 0, tz).toISOString();
        preenchidas.push({
          raw,
          minutos: hh * 60 + mm,
          iso,
          existente: regDoSlot(i, count),
        });
      }

      // 2. Ordena cronologicamente: o horário mais antigo vem primeiro,
      //    independentemente de em qual campo o usuário digitou. Assim, mesmo
      //    que ele inverta uma entrada com uma saída, o sistema corrige a ordem.
      preenchidas.sort((a, b) => a.minutos - b.minutos);
      const total = preenchidas.length;

      const inserts: {
        user_id: string;
        tipo: Tipo;
        data_hora: string;
        data_hora_original: string;
        origem: string;
      }[] = [];
      const updates: { id: string; data_hora: string; tipo: Tipo }[] = [];

      // 3. Reatribui o papel (entrada / intervalos / saída) pela posição
      //    cronológica correta.
      for (let pos = 0; pos < total; pos++) {
        const item = preenchidas[pos];
        const tipo = tipoPorPosicao(pos, total);
        if (item.existente) {
          const p = getZonedParts(new Date(item.existente.data_hora), tz);
          const atual = `${String(p.hour).padStart(2, "0")}:${String(
            p.minute,
          ).padStart(2, "0")}`;
          if (atual !== item.raw || item.existente.tipo !== tipo) {
            updates.push({ id: item.existente.id, data_hora: item.iso, tipo });
          }
        } else {
          inserts.push({
            user_id: userId,
            tipo,
            data_hora: item.iso,
            data_hora_original: item.iso,
            origem: "web",
          });
        }
      }

      if (inserts.length === 0 && updates.length === 0) {
        toast.info("Nenhuma alteração para salvar.");
        setSaving(false);
        return;
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from("ponto_registros").insert(inserts);
        if (error) throw error;
      }
      for (const u of updates) {
        const { error } = await supabase
          .from("ponto_registros")
          .update({ data_hora: u.data_hora, tipo: u.tipo, foi_editado: true })
          .eq("id", u.id);
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["registros", userId] });
      toast.success(
        inserts.length > 0 && updates.length === 0
          ? "Ponto adicionado."
          : "Ponto atualizado.",
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(mensagemErro(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">{formatDayKey(dayKey)}</DialogTitle>
          <DialogDescription>
            Adicione ou ajuste as batidas deste dia. Campos em branco não criam
            registro.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          {(() => null)()}
          {values.slice(0, count).map((val, i, arr) => {
            // Foca o primeiro campo vazio (ponto faltando) para o usuário
            // apenas digitar o horário que falta.
            const firstEmpty = arr.findIndex((v) => !v.trim());
            const label = rotuloBatida(i, count);
            const jaExiste = !!regDoSlot(i, count);
            // Início de um par de intervalo removível (não é entrada nem saída).
            const podeRemover =
              count > 4 && i % 2 === 1 && i !== count - 1;
            return (
              <div key={i} className="space-y-1.5">
                <Label
                  htmlFor={`dia-${i}`}
                  className="flex items-center gap-2"
                >
                  {label}
                  {jaExiste && (
                    <span className="text-[10px] font-normal text-muted-foreground">
                      (registrado)
                    </span>
                  )}
                  {podeRemover && (
                    <button
                      type="button"
                      onClick={() => removeIntervalo(i)}
                      className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-negativo"
                    >
                      <X className="h-3 w-3" />
                      remover intervalo
                    </button>
                  )}
                </Label>
                <Input
                  id={`dia-${i}`}
                  type="time"
                  value={val}
                  onChange={(e) =>
                    setValues((v) => {
                      const arr = [...v];
                      arr[i] = e.target.value;
                      return arr;
                    })
                  }
                  className="h-11 text-center text-base font-semibold tabular-nums"
                />
              </div>
            );
          })}

          {count < MAX_PONTOS && (
            <Button
              type="button"
              variant="outline"
              onClick={addIntervalo}
              className="h-10 w-full rounded-full text-sm"
            >
              <Plus className="h-4 w-4" />
              Adicionar intervalo
            </Button>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">
            Registros não podem ser apagados. Você é responsável pelos horários
            informados.
          </p>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 flex-1 rounded-full"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-11 flex-1 rounded-full font-semibold"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
