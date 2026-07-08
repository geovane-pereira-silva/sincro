import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook do Asaas.
 * Rota pública (bypassa auth no site publicado). A autenticidade é validada
 * pelo header `asaas-access-token`, comparado com o segredo ASAAS_WEBHOOK_TOKEN.
 * Cada evento recebido é gravado em `asaas_webhook_eventos` para auditoria.
 */
export const Route = createFileRoute("/api/public/asaas/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const tokenEsperado = process.env.ASAAS_WEBHOOK_TOKEN;
        const tokenRecebido = request.headers.get("asaas-access-token");
        const ehTeste = request.headers.get("x-sincro-test") === "1";
        const origem = ehTeste ? "teste" : "asaas";
        const tokenValido =
          !tokenEsperado || (!!tokenRecebido && tokenRecebido === tokenEsperado);

        const raw = await request.text();
        let payload: {
          event?: string;
          payment?: {
            id?: string;
            subscription?: string;
            value?: number;
          };
        } = {};
        let parseOk = true;
        try {
          payload = raw ? JSON.parse(raw) : {};
        } catch {
          parseOk = false;
        }

        const evento = payload.event ?? "(sem evento)";
        const paymentId = payload.payment?.id;
        const subscriptionId = payload.payment?.subscription;
        const valor = payload.payment?.value;

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        async function registrar(
          status: string,
          erro: string | null,
        ): Promise<void> {
          try {
            await supabaseAdmin.from("asaas_webhook_eventos").insert({
              evento,
              payment_id: paymentId ?? null,
              subscription_id: subscriptionId ?? null,
              valor: valor ?? null,
              token_valido: tokenValido,
              origem,
              status_processamento: status,
              erro,
              payload: (parseOk ? payload : { raw }) as never,
            } as never);
          } catch (e) {
            console.error("[asaas-webhook] falha ao registrar evento", e);
          }
        }

        if (!tokenValido) {
          await registrar("ignorado", "Token inválido");
          return new Response("Invalid token", { status: 401 });
        }
        if (!parseOk) {
          await registrar("erro", "Payload inválido");
          return new Response("Bad request", { status: 400 });
        }
        if (!payload.event) {
          await registrar("ignorado", "Sem campo event");
          return new Response("ok");
        }

        const svc = await import("@/lib/assinaturas.server");
        const match = {
          payment: paymentId ?? undefined,
          subscription: subscriptionId ?? undefined,
        };

        try {
          switch (payload.event) {
            case "PAYMENT_CONFIRMED":
            case "PAYMENT_RECEIVED": {
              const info = await svc.atualizarStatusAssinatura(match, {
                status: "active",
                ...(paymentId ? { asaas_payment_id: paymentId } : {}),
              });
              if (info) {
                await svc.ativarPremium(info.user_id, info.plano, info.valor);
                await svc.registrarCrm(
                  info.user_id,
                  "upgrade",
                  `Pagamento confirmado (${info.plano})`,
                );
              }
              break;
            }
            case "PAYMENT_OVERDUE": {
              await svc.atualizarStatusAssinatura(match, { status: "overdue" });
              break;
            }
            case "SUBSCRIPTION_CANCELLED": {
              const info = await svc.atualizarStatusAssinatura(match, {
                status: "cancelled",
                cancelado_em: new Date().toISOString(),
              });
              if (info) {
                await svc.registrarCrm(
                  info.user_id,
                  "cancelamento",
                  "Assinatura cancelada (Asaas)",
                );
              }
              break;
            }
            case "PAYMENT_REFUNDED": {
              const info = await svc.atualizarStatusAssinatura(match, {
                status: "cancelled",
                cancelado_em: new Date().toISOString(),
                motivo_cancelamento: "Reembolso",
              });
              if (info) {
                await svc.revogarPremiumPago(info.user_id);
                await svc.registrarCrm(
                  info.user_id,
                  "cancelamento",
                  "Pagamento reembolsado — premium revogado",
                );
              }
              break;
            }
            default:
              break;
          }
        } catch (err) {
          console.error("[asaas-webhook]", err);
          await registrar("erro", (err as Error)?.message ?? "Erro");
          return new Response("error", { status: 500 });
        }

        await registrar("processado", null);
        return new Response("ok");
      },
    },
  },
});
