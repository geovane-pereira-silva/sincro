import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook do Asaas.
 * Rota pública (bypassa auth no site publicado). A autenticidade é validada
 * pelo header `asaas-access-token`, comparado com o segredo ASAAS_WEBHOOK_TOKEN.
 */
export const Route = createFileRoute("/api/public/asaas/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const tokenEsperado = process.env.ASAAS_WEBHOOK_TOKEN;
        const tokenRecebido = request.headers.get("asaas-access-token");
        if (
          tokenEsperado &&
          (!tokenRecebido || tokenRecebido !== tokenEsperado)
        ) {
          return new Response("Invalid token", { status: 401 });
        }

        let payload: {
          event?: string;
          payment?: {
            id?: string;
            subscription?: string;
            value?: number;
          };
        };
        try {
          payload = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const evento = payload.event;
        const paymentId = payload.payment?.id;
        const subscriptionId = payload.payment?.subscription;
        if (!evento) return new Response("ok");

        const svc = await import("@/lib/assinaturas.server");

        const match = {
          payment: paymentId ?? undefined,
          subscription: subscriptionId ?? undefined,
        };

        try {
          switch (evento) {
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
          return new Response("error", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
