import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useJornadaConfig } from "@/hooks/use-jornada-config";
import { useConfigNotificacoes } from "@/hooks/use-config-notificacoes";
import { CONFIG_NOTIF_DEFAULT } from "@/hooks/use-config-notificacoes";
import {
  agendarLembretePonto,
  cancelarLembretes,
  dispararNotificacaoPush,
  permissaoPushAtual,
  pushSuportado,
  solicitarPermissaoPush,
  appInstalado,
  registrarServiceWorker,
  type ConfigNotificacoes,
} from "@/lib/pushNotifications";

// Agenda lembretes locais de ponto com base nas preferências do usuário.
// Regras:
// - Todo usuário logado (navegador ou app instalado) recebe lembretes.
// - Se não houver preferências salvas, usamos os padrões (entrada/saída/intervalo ligados).
// - App instalado (standalone): força notificação de sistema (pop-up) e pede
//   permissão automaticamente se ainda não foi concedida.
export function useLembretesPonto() {
  const { user } = useAuth();
  const { data: jornada } = useJornadaConfig(user?.id);
  const { data: config, isLoading } = useConfigNotificacoes(user?.id);

  useEffect(() => {
    if (!user?.id || isLoading) return;

    const instalado = appInstalado();

    // Garante o service worker registrado (necessário para pop-up no celular).
    void registrarServiceWorker();

    // Quando instalado como app, pedimos permissão automaticamente para poder
    // exibir os lembretes como pop-up do sistema.
    if (instalado && pushSuportado() && permissaoPushAtual() === "default") {
      void solicitarPermissaoPush();
    }

    // Usa as preferências salvas ou os padrões (para quem nunca abriu as configs).
    const base = config ?? CONFIG_NOTIF_DEFAULT;
    const cfg: ConfigNotificacoes = {
      lembrete_entrada: base.lembrete_entrada,
      lembrete_entrada_horario: base.lembrete_entrada_horario,
      lembrete_saida: base.lembrete_saida,
      lembrete_intervalo: base.lembrete_intervalo,
      lembrete_antecedencia_minutos: base.lembrete_antecedencia_minutos,
      push_habilitado: base.push_habilitado,
    };

    agendarLembretePonto(cfg, jornada ?? null, (titulo, mensagem) => {
      const podePush =
        permissaoPushAtual() === "granted" &&
        (cfg.push_habilitado || instalado);

      if (podePush) {
        void dispararNotificacaoPush(titulo, mensagem, "/ponto");
        // No app instalado o pop-up já é o canal principal; ainda mostramos o
        // toast quando o app está aberto para reforçar.
        toast(titulo, { description: mensagem });
      } else {
        // Navegador sem permissão: fallback para toast na tela.
        toast(titulo, { description: mensagem });
      }
    });

    return () => cancelarLembretes();
  }, [user?.id, config, isLoading, jornada]);
}
