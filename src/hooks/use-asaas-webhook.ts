import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  statusWebhookAsaas,
  dispararTesteWebhookAsaas,
  type StatusWebhook,
  type ResultadoTeste,
} from "@/lib/asaas-webhook.functions";

export interface EventoAsaas {
  id: string;
  evento: string;
  payment_id: string | null;
  subscription_id: string | null;
  valor: number | null;
  token_valido: boolean;
  origem: string;
  status_processamento: string;
  erro: string | null;
  created_at: string;
}

export function useStatusWebhook() {
  const fn = useServerFn(statusWebhookAsaas);
  return useQuery({
    queryKey: ["asaas-webhook-status"],
    queryFn: () => fn() as Promise<StatusWebhook>,
  });
}

export function useEventosAsaas() {
  return useQuery({
    queryKey: ["asaas-webhook-eventos"],
    queryFn: async (): Promise<EventoAsaas[]> => {
      const { data, error } = await supabase
        .from("asaas_webhook_eventos")
        .select(
          "id, evento, payment_id, subscription_id, valor, token_valido, origem, status_processamento, erro, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as EventoAsaas[];
    },
  });
}

export function useDispararTeste() {
  const fn = useServerFn(dispararTesteWebhookAsaas);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fn() as Promise<ResultadoTeste>,
    onSuccess: (r) => {
      if (r.ok) toast.success(r.mensagem);
      else toast.error(r.mensagem);
      qc.invalidateQueries({ queryKey: ["asaas-webhook-eventos"] });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao disparar teste."),
  });
}
