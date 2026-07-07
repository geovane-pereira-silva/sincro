import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLANOS, type FormaPagamento, type PlanoPago } from "./asaas";

/* ------------------------------------------------------------------ */
/* Tipos de contexto                                                  */
/* ------------------------------------------------------------------ */

type SupaLike = {
  from: (t: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<any>;
};
type AuthedContext = { supabase: SupaLike; userId: string };

async function assertSuperadmin(context: AuthedContext): Promise<void> {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "superadmin",
  });
  if (error || data !== true) throw new Error("Forbidden");
}

/* ------------------------------------------------------------------ */
/* Checkout — cria assinatura no Asaas e registra localmente          */
/* ------------------------------------------------------------------ */

export interface CheckoutInput {
  plano: PlanoPago;
  forma: FormaPagamento;
  nome: string;
  cpfCnpj: string;
  email: string;
  cartao?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
}

export interface CheckoutResult {
  assinaturaId: string;
  paymentId: string;
  status: string;
  forma: FormaPagamento;
  pix?: { encodedImage: string; payload: string; expirationDate?: string };
  boleto?: { url: string; linhaDigitavel: string };
  aprovado: boolean;
}

export const criarCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CheckoutInput) => input)
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { userId } = context as unknown as AuthedContext;
    const info = PLANOS[data.plano];
    if (!info) throw new Error("Plano inválido");

    const asaas = await import("./asaas.server");
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const cliente = await asaas.criarClienteAsaas({
      name: data.nome,
      email: data.email,
      cpfCnpj: data.cpfCnpj.replace(/\D/g, ""),
    });

    const assinatura = await asaas.criarAssinaturaAsaas({
      customer: cliente.id,
      billingType: data.forma,
      value: info.valor,
      plano: data.plano,
      description: `SINCRO ${info.nome}`,
      ...(data.forma === "CREDIT_CARD" && data.cartao
        ? {
            creditCard: data.cartao,
            creditCardHolderInfo: {
              name: data.nome,
              email: data.email,
              cpfCnpj: data.cpfCnpj.replace(/\D/g, ""),
            },
          }
        : {}),
    });

    const cobranca = await asaas.primeiraCobrancaAssinatura(assinatura.id);
    if (!cobranca) throw new Error("Não foi possível gerar a cobrança.");

    const aprovado =
      cobranca.status === "CONFIRMED" || cobranca.status === "RECEIVED";

    // Registra localmente (service role bypassa RLS)
    const { data: inserted, error } = await supabaseAdmin
      .from("assinaturas")
      .insert({
        user_id: userId,
        asaas_customer_id: cliente.id,
        asaas_subscription_id: assinatura.id,
        asaas_payment_id: cobranca.id,
        plano: data.plano,
        status: aprovado ? "active" : "pending",
        valor: info.valor,
        proximo_vencimento: assinatura.nextDueDate ?? cobranca.dueDate ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;

    const result: CheckoutResult = {
      assinaturaId: (inserted as { id: string }).id,
      paymentId: cobranca.id,
      status: cobranca.status,
      forma: data.forma,
      aprovado,
    };

    if (data.forma === "PIX") {
      const qr = await asaas.obterPixQrCode(cobranca.id);
      result.pix = {
        encodedImage: qr.encodedImage,
        payload: qr.payload,
        expirationDate: qr.expirationDate,
      };
    } else if (data.forma === "BOLETO") {
      const linha = await asaas
        .obterLinhaDigitavel(cobranca.id)
        .catch(() => ({ identificationField: "" }));
      result.boleto = {
        url: cobranca.bankSlipUrl ?? cobranca.invoiceUrl ?? "",
        linhaDigitavel: linha.identificationField ?? "",
      };
    }

    // Cartão aprovado imediatamente → ativa premium sem esperar webhook
    if (aprovado) {
      const svc = await import("./assinaturas.server");
      await svc.ativarPremium(userId, data.plano, info.valor);
      await svc.registrarCrm(
        userId,
        "upgrade",
        `Assinatura ${info.nome} via ${data.forma}`,
      );
    }

    return result;
  });

/* ------------------------------------------------------------------ */
/* Verificação de pagamento (polling PIX/boleto)                      */
/* ------------------------------------------------------------------ */

export const verificarPagamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { paymentId: string }) => input)
  .handler(async ({ data, context }): Promise<{ pago: boolean }> => {
    const { userId } = context as unknown as AuthedContext;
    const asaas = await import("./asaas.server");
    const cobranca = await asaas.obterCobranca(data.paymentId);
    const pago =
      cobranca.status === "CONFIRMED" || cobranca.status === "RECEIVED";
    if (!pago) return { pago: false };

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: row } = await supabaseAdmin
      .from("assinaturas")
      .select("*")
      .eq("asaas_payment_id", data.paymentId)
      .maybeSingle();
    if (!row || row.user_id !== userId) return { pago: true };
    if (row.status === "active") return { pago: true };

    const svc = await import("./assinaturas.server");
    await supabaseAdmin
      .from("assinaturas")
      .update({ status: "active" })
      .eq("id", row.id);
    await svc.ativarPremium(
      userId,
      row.plano as PlanoPago,
      Number(row.valor),
    );
    await svc.registrarCrm(
      userId,
      "upgrade",
      `Pagamento confirmado — ${row.plano}`,
    );
    return { pago: true };
  });

/* ------------------------------------------------------------------ */
/* Minha assinatura                                                   */
/* ------------------------------------------------------------------ */

export const cancelarMinhaAssinatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { motivo?: string }) => input)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { userId } = context as unknown as AuthedContext;
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: row } = await supabaseAdmin
      .from("assinaturas")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "overdue", "pending"])
      .order("created_at", { ascending: false })
      .maybeSingle();
    if (!row) throw new Error("Nenhuma assinatura ativa encontrada.");

    if (row.asaas_subscription_id) {
      const asaas = await import("./asaas.server");
      await asaas
        .cancelarAssinaturaAsaas(row.asaas_subscription_id)
        .catch(() => undefined);
    }

    await supabaseAdmin
      .from("assinaturas")
      .update({
        status: "cancelled",
        cancelado_em: new Date().toISOString(),
        motivo_cancelamento: data.motivo ?? null,
      })
      .eq("id", row.id);

    const svc = await import("./assinaturas.server");
    // NÃO revoga premium — mantém até o vencimento
    await svc.registrarCrm(
      userId,
      "cancelamento",
      data.motivo ?? "Cancelou a assinatura",
    );
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Admin                                                              */
/* ------------------------------------------------------------------ */

export const cancelarAssinaturaAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { assinaturaId: string; motivo?: string }) => input)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertSuperadmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: row } = await supabaseAdmin
      .from("assinaturas")
      .select("*")
      .eq("id", data.assinaturaId)
      .maybeSingle();
    if (!row) throw new Error("Assinatura não encontrada.");

    if (row.asaas_subscription_id) {
      const asaas = await import("./asaas.server");
      await asaas
        .cancelarAssinaturaAsaas(row.asaas_subscription_id)
        .catch(() => undefined);
    }
    await supabaseAdmin
      .from("assinaturas")
      .update({
        status: "cancelled",
        cancelado_em: new Date().toISOString(),
        motivo_cancelamento: data.motivo ?? "Cancelado pelo admin",
      })
      .eq("id", data.assinaturaId);

    const svc = await import("./assinaturas.server");
    await svc.registrarCrm(
      row.user_id,
      "cancelamento",
      data.motivo ?? "Cancelado pelo admin",
    );
    return { ok: true };
  });
