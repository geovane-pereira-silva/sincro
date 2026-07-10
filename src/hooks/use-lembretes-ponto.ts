import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useJornadaConfig } from "@/hooks/use-jornada-config";
import { useConfigNotificacoes } from "@/hooks/use-config-notificacoes";
import {
  agendarLembretePonto,
  cancelarLembretes,
  dispararNotificacaoPush,
  permissaoPushAtual,
  registrarServiceWorker,
  type ConfigNotificacoes,
} from "@/lib/pushNotifications";

// Agenda lembretes locais de ponto com base nas preferências do usuário.
export function useLembretesPonto() {
  const { user } = useAuth();
  const { data: jornada } = useJornadaConfig(user?.id);
  const { data: config } = useConfigNotificacoes(user?.id);

  useEffect(() => {
    if (!config) return;
    // Garante o service worker registrado (necessário no celular).
    if (config.push_habilitado && permissaoPushAtual() === "granted") {
      void registrarServiceWorker();
    }
    const cfg: ConfigNotificacoes = {
      lembrete_entrada: config.lembrete_entrada,
      lembrete_entrada_horario: config.lembrete_entrada_horario,
      lembrete_saida: config.lembrete_saida,
      lembrete_intervalo: config.lembrete_intervalo,
      lembrete_antecedencia_minutos: config.lembrete_antecedencia_minutos,
      push_habilitado: config.push_habilitado,
    };

    agendarLembretePonto(cfg, jornada ?? null, (titulo, mensagem) => {
      // Push quando permitido; senão, fallback via toast na tela.
      if (config.push_habilitado && permissaoPushAtual() === "granted") {
        dispararNotificacaoPush(titulo, mensagem, "/ponto");
      } else {
        toast(titulo, { description: mensagem });
      }
    });

    return () => cancelarLembretes();
  }, [config, jornada]);
}
