import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertGestaoEmpresa,
  assertSuperadminOuGestor,
  empresaDoRegistro,
  type AuthedCtx,
} from "@/lib/gestao-auth";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type AuthedContext = AuthedCtx;

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

function conviteExpirado(enviadoEm: string | null): boolean {
  if (!enviadoEm) return false;
  return Date.now() - new Date(enviadoEm).getTime() > SETE_DIAS_MS;
}

/* ------------------------------------------------------------------ */
/* Admin: criar convite                                               */
/* ------------------------------------------------------------------ */

export const criarConviteColaborador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      empresaId: string;
      valores: Record<string, unknown>;
      jornadaId?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    await assertGestaoEmpresa(
      context as unknown as AuthedContext,
      supabaseAdmin,
      data.empresaId,
    );

    const token = crypto.randomUUID();
    const { data: row, error } = await supabaseAdmin
      .from("colaboradores")
      .insert({
        ...data.valores,
        empresa_id: data.empresaId,
        ativo: false,
        convite_pendente: true,
        convite_token: token,
        convite_enviado_em: new Date().toISOString(),
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.jornadaId) {
      await supabaseAdmin.from("colaborador_jornadas").insert({
        colaborador_id: row.id,
        jornada_id: data.jornadaId,
        data_inicio: new Date().toISOString().slice(0, 10),
      } as never);
    }

    return { ok: true, id: row.id, token };
  });

/* ------------------------------------------------------------------ */
/* Admin: reenviar convite (regenera token)                           */
/* ------------------------------------------------------------------ */

export const reenviarConvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const empresaId = await empresaDoRegistro(
      supabaseAdmin,
      "colaboradores",
      data.id,
    );
    await assertGestaoEmpresa(
      context as unknown as AuthedContext,
      supabaseAdmin,
      empresaId,
    );
    const token = crypto.randomUUID();
    const { error } = await supabaseAdmin
      .from("colaboradores")
      .update({
        convite_token: token,
        convite_enviado_em: new Date().toISOString(),
        convite_pendente: true,
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, token };
  });

/* ------------------------------------------------------------------ */
/* Público: buscar convite pelo token                                 */
/* ------------------------------------------------------------------ */

export type ConviteStatus =
  | { status: "invalido" }
  | { status: "expirado" }
  | { status: "aceito" }
  | {
      status: "valido";
      colaborador: {
        nome: string;
        email: string;
        cpf: string | null;
        empresaId: string;
        empresaNome: string;
      };
    };

export const getConvite = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }): Promise<ConviteStatus> => {
    const token = (data.token ?? "").trim();
    if (!token) return { status: "invalido" };
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: col, error } = await supabaseAdmin
      .from("colaboradores")
      .select(
        "id, nome_completo, email, cpf, empresa_id, convite_enviado_em, convite_aceito_em",
      )
      .eq("convite_token", token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!col) return { status: "invalido" };
    if (col.convite_aceito_em) return { status: "aceito" };
    if (conviteExpirado(col.convite_enviado_em)) return { status: "expirado" };

    const { data: emp } = await supabaseAdmin
      .from("empresas")
      .select("nome")
      .eq("id", col.empresa_id)
      .maybeSingle();

    return {
      status: "valido",
      colaborador: {
        nome: col.nome_completo,
        email: col.email ?? "",
        cpf: col.cpf,
        empresaId: col.empresa_id,
        empresaNome: emp?.nome ?? "",
      },
    };
  });

/* ------------------------------------------------------------------ */
/* Público: marcar convite como aceito                                */
/* ------------------------------------------------------------------ */

export const marcarConviteAceito = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; cpf?: string | null }) => input)
  .handler(async ({ data }) => {
    const token = (data.token ?? "").trim();
    if (!token) throw new Error("Convite inválido.");
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: col, error: e1 } = await supabaseAdmin
      .from("colaboradores")
      .select("id, convite_enviado_em, convite_aceito_em")
      .eq("convite_token", token)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!col) throw new Error("Convite inválido.");
    if (col.convite_aceito_em) return { ok: true };
    if (conviteExpirado(col.convite_enviado_em)) {
      throw new Error("Convite expirado.");
    }

    const patch: Record<string, unknown> = {
      convite_aceito_em: new Date().toISOString(),
      convite_pendente: false,
      ativo: true,
    };
    if (data.cpf && data.cpf.trim()) patch.cpf = data.cpf.trim();

    const { error } = await supabaseAdmin
      .from("colaboradores")
      .update(patch as never)
      .eq("id", col.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Admin: enviar e-mail de convite (via Resend)                        */
/* ------------------------------------------------------------------ */

export const enviarEmailConvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      email: string;
      nome: string;
      empresaNome: string;
      link: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context as unknown as AuthedContext);
    const { enviarConviteEmail } = await import("@/lib/email.server");
    await enviarConviteEmail(data);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Público: solicitar novo convite (token expirado)                    */
/* ------------------------------------------------------------------ */

export const solicitarNovoConvite = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; email?: string | null }) => input)
  .handler(async ({ data }) => {
    const token = (data.token ?? "").trim();
    if (!token) throw new Error("Convite inválido.");
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: col, error } = await supabaseAdmin
      .from("colaboradores")
      .select("id, nome_completo, email, empresa_id, convite_aceito_em")
      .eq("convite_token", token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!col) throw new Error("Convite inválido.");
    if (col.convite_aceito_em) throw new Error("Esta conta já foi criada.");

    const { data: emp } = await supabaseAdmin
      .from("empresas")
      .select("nome, email_contato, admin_user_id")
      .eq("id", col.empresa_id)
      .maybeSingle();

    // Resolve e-mail do admin da empresa (contato ou perfil do admin).
    let adminEmail = emp?.email_contato ?? null;
    if (!adminEmail && emp?.admin_user_id) {
      const { data: perfil } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", emp.admin_user_id)
        .maybeSingle();
      adminEmail = perfil?.email ?? null;
    }
    if (!adminEmail) {
      // Nenhum admin configurado: registra intenção, mas não há para quem enviar.
      return { ok: false as const, motivo: "sem_admin" as const };
    }

    const { notificarAdminNovoConvite } = await import("@/lib/email.server");
    await notificarAdminNovoConvite({
      adminEmail,
      empresaNome: emp?.nome ?? "sua empresa",
      colaboradorNome: col.nome_completo,
      colaboradorEmail: (data.email ?? col.email ?? "").trim() || "—",
    });
    return { ok: true as const };
  });
