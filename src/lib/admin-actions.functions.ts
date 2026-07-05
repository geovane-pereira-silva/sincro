import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

type AuthedContext = {
  supabase: {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
  };
  userId: string;
};

async function assertSuperadmin(context: AuthedContext): Promise<void> {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "superadmin",
  });
  if (error || data !== true) {
    throw new Error("Forbidden");
  }
}

async function registrarAuditoria(
  adminId: string,
  acao: string,
  tabela: string,
  registroId: string,
  dadosAnteriores: unknown,
  motivo: string | null,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: adminId,
    acao,
    tabela,
    registro_id: registroId,
    dados_anteriores: (dadosAnteriores ?? null) as never,
    motivo,
  });
}

/* ------------------------------------------------------------------ */
/* Editar perfil (via service_role — inclui e-mail no Auth)           */
/* ------------------------------------------------------------------ */

export const editarPerfilAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      userId: string;
      nome_completo: string | null;
      email: string;
      profissao: string | null;
      carga_horaria_diaria: number;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: anterior } = await supabaseAdmin
      .from("profiles")
      .select("nome_completo, email, profissao, carga_horaria_diaria")
      .eq("id", data.userId)
      .maybeSingle();

    // Atualiza e-mail no Auth quando mudou.
    if (anterior && data.email && anterior.email !== data.email) {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
        data.userId,
        { email: data.email },
      );
      if (authErr) throw new Error(authErr.message);
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        nome_completo: data.nome_completo,
        email: data.email,
        profissao: data.profissao,
        carga_horaria_diaria: data.carga_horaria_diaria,
      })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    await registrarAuditoria(
      context.userId,
      "editar_perfil",
      "profiles",
      data.userId,
      anterior,
      null,
    );
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Bloquear / desbloquear conta                                       */
/* ------------------------------------------------------------------ */

export const toggleBloqueioAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { userId: string; bloqueado: boolean; motivo: string }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: anterior } = await supabaseAdmin
      .from("profiles")
      .select("bloqueado")
      .eq("id", data.userId)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ bloqueado: data.bloqueado })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    await registrarAuditoria(
      context.userId,
      data.bloqueado ? "bloquear_conta" : "desbloquear_conta",
      "profiles",
      data.userId,
      anterior,
      data.motivo,
    );
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Conceder premium em lote                                           */
/* ------------------------------------------------------------------ */

export const concederPremiumLote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { userIds: string[]; dias: number; motivo: string }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const validoAte = new Date(
      Date.now() + data.dias * 24 * 3600 * 1000,
    ).toISOString();

    const rows = data.userIds.map((uid) => ({
      user_id: uid,
      motivo: data.motivo,
      valido_ate: validoAte,
    }));

    const { data: inseridos, error } = await supabaseAdmin
      .from("premium_access")
      .insert(rows)
      .select("id, user_id");
    if (error) throw new Error(error.message);

    for (const r of inseridos ?? []) {
      await registrarAuditoria(
        context.userId,
        "conceder_premium",
        "premium_access",
        r.id,
        { user_id: r.user_id, dias: data.dias, motivo: data.motivo },
        data.motivo,
      );
    }
    return { ok: true, count: rows.length };
  });

/* ------------------------------------------------------------------ */
/* Revogar premium                                                    */
/* ------------------------------------------------------------------ */

export const revogarPremiumAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { premiumId: string; motivo: string }) => input)
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: anterior } = await supabaseAdmin
      .from("premium_access")
      .select("user_id, motivo, valido_ate")
      .eq("id", data.premiumId)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("premium_access")
      .delete()
      .eq("id", data.premiumId);
    if (error) throw new Error(error.message);

    await registrarAuditoria(
      context.userId,
      "revogar_premium",
      "premium_access",
      data.premiumId,
      anterior,
      data.motivo,
    );
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Excluir batida                                                     */
/* ------------------------------------------------------------------ */

export const excluirBatidaAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { registroId: string; motivo: string }) => input)
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: anterior } = await supabaseAdmin
      .from("ponto_registros")
      .select("*")
      .eq("id", data.registroId)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("ponto_registros")
      .delete()
      .eq("id", data.registroId);
    if (error) throw new Error(error.message);

    await registrarAuditoria(
      context.userId,
      "excluir_batida",
      "ponto_registros",
      data.registroId,
      anterior,
      data.motivo,
    );
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Notas internas do usuário                                          */
/* ------------------------------------------------------------------ */

export const salvarNotasAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; notas: string }) => input)
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ admin_notes: data.notas })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Lê as notas internas de um usuário (apenas superadmin). */
export const lerNotasAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: row } = await supabaseAdmin
      .from("profiles")
      .select("admin_notes")
      .eq("id", data.userId)
      .maybeSingle();
    return { notas: row?.admin_notes ?? "" };
  });

/* ------------------------------------------------------------------ */
/* Configurações administrativas                                      */
/* ------------------------------------------------------------------ */

export const salvarConfigAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { entries: { chave: string; valor: string }[] }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    for (const e of data.entries) {
      const { error } = await supabaseAdmin
        .from("admin_config")
        .update({ valor: e.valor, updated_by: context.userId })
        .eq("chave", e.chave);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
