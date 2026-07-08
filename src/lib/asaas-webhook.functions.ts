import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type AuthedCtx } from "@/lib/gestao-auth";

async function assertSuperadmin(ctx: AuthedCtx): Promise<void> {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "superadmin",
  });
  if (error || data !== true) throw new Error("Forbidden");
}

function origemDaRequisicao(): string {
  try {
    const url = new URL(getRequestUrl());
    return url.origin;
  } catch {
    return "";
  }
}

export interface StatusWebhook {
  tokenConfigurado: boolean;
  apiKeyConfigurada: boolean;
  endpoint: string;
  ambiente: string;
}

export const statusWebhookAsaas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StatusWebhook> => {
    await assertSuperadmin(context as unknown as AuthedCtx);
    const origem = origemDaRequisicao();
    return {
      tokenConfigurado: !!process.env.ASAAS_WEBHOOK_TOKEN,
      apiKeyConfigurada: !!process.env.ASAAS_API_KEY,
      endpoint: origem ? `${origem}/api/public/asaas/webhook` : "",
      ambiente: process.env.VITE_ASAAS_ENVIRONMENT ?? "sandbox",
    };
  });

export interface ResultadoTeste {
  ok: boolean;
  status: number;
  mensagem: string;
}

/**
 * Dispara um evento de teste no próprio endpoint do webhook, com o token
 * correto e marcado como teste, para validar a rota ponta a ponta.
 */
export const dispararTesteWebhookAsaas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ResultadoTeste> => {
    await assertSuperadmin(context as unknown as AuthedCtx);
    const origem = origemDaRequisicao();
    if (!origem) {
      return { ok: false, status: 0, mensagem: "Não foi possível resolver a URL do endpoint." };
    }
    const endpoint = `${origem}/api/public/asaas/webhook`;
    const body = JSON.stringify({
      event: "PAYMENT_CREATED",
      payment: {
        id: `pay_teste_${Date.now()}`,
        subscription: "sub_teste",
        value: 0,
      },
    });
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-sincro-test": "1",
          ...(process.env.ASAAS_WEBHOOK_TOKEN
            ? { "asaas-access-token": process.env.ASAAS_WEBHOOK_TOKEN }
            : {}),
        },
        body,
      });
      return {
        ok: resp.ok,
        status: resp.status,
        mensagem: resp.ok
          ? "Evento de teste entregue e registrado com sucesso."
          : `O endpoint respondeu com status ${resp.status}.`,
      };
    } catch (e) {
      return {
        ok: false,
        status: 0,
        mensagem: (e as Error)?.message ?? "Falha ao contatar o endpoint.",
      };
    }
  });
