import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mensagemErro } from "@/lib/erros";
import { JORNADA_CONFIG_DEFAULT } from "@/lib/calculoTrabalhista";

const FLAG_KEY = "sincro_jornada_modal_shown";

// Modal único (não obrigatório) mostrado após o onboarding quando o usuário
// ainda não configurou a jornada. Aparece no máximo uma vez (flag localStorage).
export function JornadaOnboardingModal({
  userId,
}: {
  userId: string | undefined;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [saving, setSaving] = useState(false);

  // Já foi exibido antes? Não consulta nem mostra de novo.
  const jaExibido =
    typeof window !== "undefined" &&
    window.localStorage.getItem(FLAG_KEY) === "1";

  const { data: existeConfig } = useQuery({
    queryKey: ["jornada-config-existe", userId],
    enabled: !!userId && !jaExibido,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from("jornada_config")
        .select("user_id")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  useEffect(() => {
    if (jaExibido || existeConfig === undefined) return;
    if (!existeConfig) {
      setAberto(true);
      window.localStorage.setItem(FLAG_KEY, "1");
    } else {
      // Já tem jornada: marca para não checar novamente.
      window.localStorage.setItem(FLAG_KEY, "1");
    }
  }, [existeConfig, jaExibido]);

  function configurarAgora() {
    setAberto(false);
    navigate({ to: "/configuracoes", hash: "minha-jornada" });
  }

  async function usarPadrao() {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("jornada_config").upsert(
        {
          user_id: userId,
          dias_trabalho: JORNADA_CONFIG_DEFAULT.dias_trabalho,
          horario_entrada: JORNADA_CONFIG_DEFAULT.horario_entrada,
          horario_saida: JORNADA_CONFIG_DEFAULT.horario_saida,
          intervalo_minutos: JORNADA_CONFIG_DEFAULT.intervalo_minutos,
          tolerancia_minutos: JORNADA_CONFIG_DEFAULT.tolerancia_minutos,
          adicional_noturno: JORNADA_CONFIG_DEFAULT.adicional_noturno,
          banco_horas_ativo: JORNADA_CONFIG_DEFAULT.banco_horas_ativo,
          banco_horas_limite_horas: JORNADA_CONFIG_DEFAULT.banco_horas_limite_horas,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      await queryClient.invalidateQueries({
        queryKey: ["jornada-config", userId],
      });
      toast.success("Jornada padrão aplicada (8h, seg–sex).");
      setAberto(false);
    } catch (err) {
      toast.error(mensagemErro(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarClock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">
            Configure sua jornada para cálculos precisos
          </DialogTitle>
          <DialogDescription className="text-center">
            Definir seus horários, intervalo e dias de trabalho deixa os cálculos
            de extras, faltas e banco de horas mais exatos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={configurarAgora}
            className="h-11 w-full rounded-xl font-semibold"
          >
            Configurar agora
          </Button>
          <Button
            variant="outline"
            onClick={usarPadrao}
            disabled={saving}
            className="h-11 w-full rounded-xl font-semibold"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Usar padrão (8h, seg–sex)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
