// Lógica de recompensas e utilidades do sistema Premium do SINCRO.
import { toast } from "sonner";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MotivoRecompensa =
  | "streak_7"
  | "perfil_completo"
  | "referral"
  | "indicado_compartilhou";

export interface Recompensa {
  motivo: MotivoRecompensa | string;
  dias: number;
  quantidade: number;
}

/** Mensagem de toast para cada tipo de recompensa concedida. */
function mensagemRecompensa(r: Recompensa): string {
  switch (r.motivo) {
    case "streak_7":
      return "🔥 7 dias seguidos! Você ganhou 7 dias de SINCRO Premium.";
    case "perfil_completo":
      return "✓ Perfil completo! Você ganhou 3 dias de SINCRO Premium.";
    case "referral":
      return r.quantidade > 1
        ? `🎉 ${r.quantidade} amigos se cadastraram! Você ganhou ${r.quantidade * 30} dias de SINCRO Premium.`
        : "🎉 Seu amigo se cadastrou! Você ganhou 30 dias de SINCRO Premium.";
    case "indicado_compartilhou":
      return "🎁 Seu indicado também indicou alguém! +15 dias de Premium para você.";
    default:
      return "✨ Você ganhou dias de SINCRO Premium.";
  }
}

/**
 * Chama a função segura do backend que verifica e concede todas as recompensas
 * pendentes (streak, perfil completo, indicações). Exibe um toast por recompensa
 * concedida e invalida o cache de status premium.
 * Nunca lança erro para não interromper o fluxo do usuário.
 */
export async function verificarRecompensasPremium(
  userId: string,
  queryClient: QueryClient,
): Promise<Recompensa[]> {
  try {
    const { data, error } = await supabase.rpc("verificar_recompensas_premium");
    if (error) throw error;

    const recompensas = ((data as unknown as Recompensa[]) ?? []).filter(
      (r) => r && r.dias > 0,
    );

    if (recompensas.length > 0) {
      for (const r of recompensas) {
        toast.success(mensagemRecompensa(r));
      }
      await queryClient.invalidateQueries({ queryKey: ["premium", userId] });
    }
    return recompensas;
  } catch {
    return [];
  }
}

/** Monta o link de indicação do usuário. */
export function montarLinkReferral(referralCode: string | null | undefined): string {
  const base =
    typeof window !== "undefined" ? window.location.origin : "https://sincro.app";
  const code = (referralCode ?? "").trim();
  return code ? `${base}/ref/${code}` : base;
}

/** Copia o link de indicação para a área de transferência e exibe toast. */
export async function copiarLinkReferral(
  referralCode: string | null | undefined,
): Promise<void> {
  const link = montarLinkReferral(referralCode);
  try {
    await navigator.clipboard.writeText(link);
    toast.success("✓ Link copiado!");
  } catch {
    // Fallback simples caso a Clipboard API não esteja disponível
    try {
      const el = document.createElement("textarea");
      el.value = link;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      toast.success("✓ Link copiado!");
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente: " + link);
    }
  }
}

/** Formata a data de validade do premium (DD/MM/AAAA). */
export function formatPremiumUntil(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
