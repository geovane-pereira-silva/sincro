import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { mensagemErro } from "@/lib/erros";
import {
  TIPO_INFO,
  formatTimeFull,
  getZonedParts,
  zonedWallToUtc,
  type PontoRegistro,
} from "@/lib/ponto";

export const Route = createFileRoute("/_authenticated/editar/$id")({
  head: () => ({ meta: [{ title: "Editar registro — SINCRO" }] }),
  component: EditarPage,
  errorComponent: () => (
    <div className="p-6 text-center text-sm text-muted-foreground">
      Não foi possível carregar esta batida.
    </div>
  ),
});

function EditarPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const tz = profile?.timezone ?? "America/Sao_Paulo";
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: registro, isLoading } = useQuery({
    queryKey: ["registro", id],
    enabled: !!user?.id,
    queryFn: async (): Promise<PontoRegistro | null> => {
      const { data, error } = await supabase
        .from("ponto_registros")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as PontoRegistro | null;
    },
  });

  const [timeInput, setTimeInput] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (registro) {
      const p = getZonedParts(new Date(registro.data_hora), tz);
      setTimeInput(
        `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`,
      );
      setJustificativa(registro.justificativa ?? "");
    }
  }, [registro, tz]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!registro || !user) return;
    if (!/^\d{2}:\d{2}$/.test(timeInput)) {
      toast.error("Horário inválido.");
      return;
    }

    setSaving(true);
    try {
      const [hh, mm] = timeInput.split(":").map(Number);
      const p = getZonedParts(new Date(registro.data_hora), tz);
      const novaData = zonedWallToUtc(p.year, p.month, p.day, hh, mm, 0, tz);

      const obs = justificativa.trim();
      const { error } = await supabase
        .from("ponto_registros")
        .update({
          data_hora: novaData.toISOString(),
          foi_editado: true,
          justificativa: obs.length > 0 ? obs : null,
        })
        .eq("id", registro.id);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["registros", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["registro", id] });
      toast.success("Batida atualizada.");
      router.history.back();
    } catch (err) {
      toast.error(mensagemErro(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell profile={profile ?? null}>
      <div className="space-y-5">
        <button
          onClick={() => router.history.back()}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !registro ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Batida não encontrada.
          </p>
        ) : (
          <form
            onSubmit={handleSave}
            className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-3 w-3 rounded-full",
                  TIPO_INFO[registro.tipo].dot,
                )}
              />
              <h1 className="text-lg font-bold text-foreground">
                {TIPO_INFO[registro.tipo].label}
              </h1>
            </div>

            <div className="space-y-1.5">
              <Label>Horário original do sistema</Label>
              <Input
                value={formatTimeFull(registro.data_hora_original, tz)}
                disabled
                className="text-muted-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hora">Horário registrado</Label>
              <Input
                id="hora"
                type="time"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                className="h-12 text-center text-lg font-semibold tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="just">Observação (opcional)</Label>
              <Textarea
                id="just"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={3}
                placeholder="Anote algo, se quiser..."
                className="resize-none"
              />
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              O horário original fica salvo para seu controle. Você é
              responsável pelos registros feitos aqui.
            </p>


            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.history.back()}
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
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
