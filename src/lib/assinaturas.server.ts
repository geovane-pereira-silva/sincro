// Lógica server-only de assinaturas: ativação de premium, atualização de
// planos e registro de eventos CRM. Usada tanto pelas server functions
// quanto pelo webhook do Asaas. Usa a service role (bypassa RLS).
import type { PlanoPago } from "./asaas";

const DIAS_PLANO: Record<PlanoPago, number> = {
  premium_mensal: 30,
  premium_anual: 365,
};

type AdminClient = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

async function admin(): Promise<AdminClient> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  return supabaseAdmin;
}

/** Concede/renova acesso premium e sincroniza user_plans. */
export async function ativarPremium(
  userId: string,
  plano: PlanoPago,
  valor: number,
): Promise<void> {
  const db = await admin();
  const dias = DIAS_PLANO[plano];
  const validoAte = new Date(Date.now() + dias * 24 * 3600 * 1000);

  await db.from("premium_access").insert({
    user_id: userId,
    motivo: "assinatura_paga",
    valido_ate: validoAte.toISOString(),
  });

  await db.from("user_plans").upsert(
    {
      user_id: userId,
      plano,
      valor_cobrado: valor,
      data_inicio: new Date().toISOString(),
      data_fim: validoAte.toISOString(),
      cancelado_em: null,
      motivo_cancelamento: null,
    },
    { onConflict: "user_id" },
  );
}

export async function registrarCrm(
  userId: string,
  tipo: "upgrade" | "cancelamento" | "downgrade" | "reativacao",
  descricao: string,
): Promise<void> {
  const db = await admin();
  await db.from("crm_eventos").insert({
    user_id: userId,
    tipo,
    descricao,
  });
}

/** Marca a assinatura com determinado status. */
export async function atualizarStatusAssinatura(
  match: { payment?: string; subscription?: string },
  patch: Record<string, unknown>,
): Promise<{ user_id: string; plano: PlanoPago; valor: number } | null> {
  const db = await admin();
  let query = db.from("assinaturas").select("*");
  if (match.payment) query = query.eq("asaas_payment_id", match.payment);
  else if (match.subscription)
    query = query.eq("asaas_subscription_id", match.subscription);
  else return null;

  const { data: row } = await query.maybeSingle();
  if (!row) return null;

  await db.from("assinaturas").update(patch as never).eq("id", row.id);
  return {
    user_id: row.user_id,
    plano: row.plano as PlanoPago,
    valor: Number(row.valor),
  };
}

/** Revoga imediatamente o premium pago (usado em reembolso). */
export async function revogarPremiumPago(userId: string): Promise<void> {
  const db = await admin();
  await db
    .from("premium_access")
    .delete()
    .eq("user_id", userId)
    .eq("motivo", "assinatura_paga");
  await db
    .from("user_plans")
    .update({ plano: "free", cancelado_em: new Date().toISOString() })
    .eq("user_id", userId);
}
