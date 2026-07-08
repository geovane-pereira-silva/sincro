import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertGestaoEmpresa,
  empresaDoRegistro,
  type AuthedCtx,
} from "@/lib/gestao-auth";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

type AuthedContext = AuthedCtx;

async function assertSuperadmin(context: AuthedContext): Promise<void> {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "superadmin",
  });
  if (error || data !== true) throw new Error("Forbidden");
}

async function registrarAuditoria(
  adminId: string,
  acao: string,
  tabela: string,
  registroId: string,
  dadosAnteriores: unknown,
  motivo: string | null,
): Promise<void> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
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
/* Empresas (somente superadmin)                                      */
/* ------------------------------------------------------------------ */

export const salvarEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id?: string; valores: Record<string, unknown> }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("empresas")
        .update(data.valores as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("empresas")
      .insert(data.valores as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const excluirEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; motivo: string }) => input)
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: anterior } = await supabaseAdmin
      .from("empresas")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("empresas")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await registrarAuditoria(
      context.userId,
      "excluir_empresa",
      "empresas",
      data.id,
      anterior,
      data.motivo,
    );
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Setores (superadmin ou gestor da empresa)                          */
/* ------------------------------------------------------------------ */

export const salvarSetor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id?: string; valores: Record<string, unknown> }) => input,
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as AuthedContext;
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const empresaId = data.id
      ? await empresaDoRegistro(supabaseAdmin, "setores", data.id)
      : ((data.valores.empresa_id as string) ?? null);
    await assertGestaoEmpresa(ctx, supabaseAdmin, empresaId);
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("setores")
        .update(data.valores as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("setores")
      .insert(data.valores as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const excluirSetor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; motivo: string }) => input)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as AuthedContext;
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const empresaId = await empresaDoRegistro(supabaseAdmin, "setores", data.id);
    await assertGestaoEmpresa(ctx, supabaseAdmin, empresaId);
    const { data: anterior } = await supabaseAdmin
      .from("setores")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("setores")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await registrarAuditoria(
      context.userId,
      "excluir_setor",
      "setores",
      data.id,
      anterior,
      data.motivo,
    );
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Colaboradores (superadmin ou gestor da empresa)                    */
/* ------------------------------------------------------------------ */

export const salvarColaborador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      valores: Record<string, unknown>;
      jornadaId?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as AuthedContext;
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const empresaId = data.id
      ? await empresaDoRegistro(supabaseAdmin, "colaboradores", data.id)
      : ((data.valores.empresa_id as string) ?? null);
    await assertGestaoEmpresa(ctx, supabaseAdmin, empresaId);
    let colaboradorId = data.id;
    if (colaboradorId) {
      const { error } = await supabaseAdmin
        .from("colaboradores")
        .update(data.valores as never)
        .eq("id", colaboradorId);
      if (error) throw new Error(error.message);
    } else {
      const { data: row, error } = await supabaseAdmin
        .from("colaboradores")
        .insert(data.valores as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      colaboradorId = row.id;
    }

    // Vincula jornada (histórico) quando informada.
    if (data.jornadaId && colaboradorId) {
      // Encerra vínculo aberto anterior.
      await supabaseAdmin
        .from("colaborador_jornadas")
        .update({ data_fim: new Date().toISOString().slice(0, 10) })
        .eq("colaborador_id", colaboradorId)
        .is("data_fim", null);
      await supabaseAdmin.from("colaborador_jornadas").insert({
        colaborador_id: colaboradorId,
        jornada_id: data.jornadaId,
        data_inicio: new Date().toISOString().slice(0, 10),
      } as never);
    }
    return { ok: true, id: colaboradorId };
  });

export const toggleColaboradorAtivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id: string; ativo: boolean; motivo: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as AuthedContext;
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const empresaId = await empresaDoRegistro(
      supabaseAdmin,
      "colaboradores",
      data.id,
    );
    await assertGestaoEmpresa(ctx, supabaseAdmin, empresaId);
    const { data: anterior } = await supabaseAdmin
      .from("colaboradores")
      .select("ativo, data_demissao")
      .eq("id", data.id)
      .maybeSingle();
    const patch: Record<string, unknown> = { ativo: data.ativo };
    if (!data.ativo) patch.data_demissao = new Date().toISOString().slice(0, 10);
    const { error } = await supabaseAdmin
      .from("colaboradores")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await registrarAuditoria(
      context.userId,
      data.ativo ? "reativar_colaborador" : "desativar_colaborador",
      "colaboradores",
      data.id,
      anterior,
      data.motivo,
    );
    return { ok: true };
  });

export const excluirColaborador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; motivo: string }) => input)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as AuthedContext;
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const empresaId = await empresaDoRegistro(
      supabaseAdmin,
      "colaboradores",
      data.id,
    );
    await assertGestaoEmpresa(ctx, supabaseAdmin, empresaId);
    const { data: anterior } = await supabaseAdmin
      .from("colaboradores")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("colaboradores")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await registrarAuditoria(
      context.userId,
      "excluir_colaborador",
      "colaboradores",
      data.id,
      anterior,
      data.motivo,
    );
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Jornadas (superadmin ou gestor da empresa)                         */
/* ------------------------------------------------------------------ */

export const salvarJornada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id?: string; valores: Record<string, unknown> }) => input,
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as AuthedContext;
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const empresaId = data.id
      ? await empresaDoRegistro(supabaseAdmin, "jornadas_empresa", data.id)
      : ((data.valores.empresa_id as string) ?? null);
    await assertGestaoEmpresa(ctx, supabaseAdmin, empresaId);
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("jornadas_empresa")
        .update(data.valores as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("jornadas_empresa")
      .insert(data.valores as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const duplicarJornada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as AuthedContext;
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const empresaId = await empresaDoRegistro(
      supabaseAdmin,
      "jornadas_empresa",
      data.id,
    );
    await assertGestaoEmpresa(ctx, supabaseAdmin, empresaId);
    const { data: orig, error: e1 } = await supabaseAdmin
      .from("jornadas_empresa")
      .select("*")
      .eq("id", data.id)
      .single();
    if (e1) throw new Error(e1.message);
    const {
      id: _id,
      created_at: _c,
      ...resto
    } = orig as Record<string, unknown>;
    const copia = { ...resto, nome: `${orig.nome} (cópia)` };
    const { data: row, error } = await supabaseAdmin
      .from("jornadas_empresa")
      .insert(copia as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const excluirJornada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; motivo: string }) => input)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as AuthedContext;
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const empresaId = await empresaDoRegistro(
      supabaseAdmin,
      "jornadas_empresa",
      data.id,
    );
    await assertGestaoEmpresa(ctx, supabaseAdmin, empresaId);
    const { data: anterior } = await supabaseAdmin
      .from("jornadas_empresa")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("jornadas_empresa")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await registrarAuditoria(
      context.userId,
      "excluir_jornada",
      "jornadas_empresa",
      data.id,
      anterior,
      data.motivo,
    );
    return { ok: true };
  });
