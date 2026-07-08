import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
  TIPO_INFO,
  TIPO_ORDEM,
  getZonedParts,
  zonedWallToUtc,
  formatDayKey,
  type PontoRegistro,
  type Tipo,
} from "@/lib/ponto";

/**
 * Editor de batidas de um dia inteiro para usuários autônomos.
 * Permite adicionar (inserir) ou ajustar (editar) os quatro pontos do dia.
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
  const [values, setValues] = useState<Record<Tipo, string>>({
    entrada: "",
    saida_intervalo: "",
    entrada_intervalo: "",
    saida: "",
  });

  // Mapa tipo -> registro existente (primeiro de cada tipo).
  const existentes: Partial<Record<Tipo, PontoRegistro>> = {};
  for (const r of registros) {
    if (!existentes[r.tipo]) existentes[r.tipo] = r;
  }

  useEffect(() => {
    if (!open) return;
    const next: Record<Tipo, string> = {
      entrada: "",
      saida_intervalo: "",
      entrada_intervalo: "",
      saida: "",
    };
    for (const tipo of TIPO_ORDEM) {
      const reg = registros.find((r) => r.tipo === tipo);
      if (reg) {
        const p = getZonedParts(new Date(reg.data_hora), tz);
        next[tipo] = `${String(p.hour).padStart(2, "0")}:${String(
          p.minute,
        ).padStart(2, "0")}`;
      }
    }
    setValues(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dayKey]);

  const [y, m, d] = dayKey.split("-").map(Number);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const inserts: {
        user_id: string;
        tipo: Tipo;
        data_hora: string;
        data_hora_original: string;
        origem: string;
      }[] = [];
      const updates: { id: string; data_hora: string }[] = [];

      for (const tipo of TIPO_ORDEM) {
        const raw = values[tipo].trim();
        const existente = registros.find((r) => r.tipo === tipo);
        if (!raw) continue; // vazio: nada a fazer (não apaga registros)
        if (!/^\d{2}:\d{2}$/.test(raw)) {
          toast.error(`Horário inválido em ${TIPO_INFO[tipo].label}.`);
          setSaving(false);
          return;
        }
        const [hh, mm] = raw.split(":").map(Number);
        if (hh > 23 || mm > 59) {
          toast.error(`Horário inválido em ${TIPO_INFO[tipo].label}.`);
          setSaving(false);
          return;
        }
        const iso = zonedWallToUtc(y, m, d, hh, mm, 0, tz).toISOString();
        if (existente) {
          const p = getZonedParts(new Date(existente.data_hora), tz);
          const atual = `${String(p.hour).padStart(2, "0")}:${String(
            p.minute,
          ).padStart(2, "0")}`;
          if (atual !== raw) updates.push({ id: existente.id, data_hora: iso });
        } else {
          inserts.push({
            user_id: userId,
            tipo,
            data_hora: iso,
            data_hora_original: iso,
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
          .update({ data_hora: u.data_hora, foi_editado: true })
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
          {TIPO_ORDEM.map((tipo) => {
            const info = TIPO_INFO[tipo];
            const jaExiste = !!existentes[tipo];
            return (
              <div key={tipo} className="space-y-1.5">
                <Label htmlFor={`dia-${tipo}`} className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", info.dot)} />
                  {info.label}
                  {jaExiste && (
                    <span className="text-[10px] font-normal text-muted-foreground">
                      (registrado)
                    </span>
                  )}
                </Label>
                <Input
                  id={`dia-${tipo}`}
                  type="time"
                  value={values[tipo]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [tipo]: e.target.value }))
                  }
                  className="h-11 text-center text-base font-semibold tabular-nums"
                />
              </div>
            );
          })}

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
