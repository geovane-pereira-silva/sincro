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
  registroId: string,
  motivo: string | null,
): Promise<void> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: adminId,
    acao,
    tabela: "user_roles",
    registro_id: registroId,
    dados_anteriores: null as never,
    motivo,
  });
}

export interface AdminRow {
  user_id: string;
  nome_completo: string | null;
  email: string;
}

/* ------------------------------------------------------------------ */
/* Listar administradores                                             */
/* ------------------------------------------------------------------ */

export const listarAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminRow[]> => {
    await assertSuperadmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "superadmin");
    if (error) throw error;
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) return [];
    const { data: perfis, error: e2 } = await supabaseAdmin
      .from("profiles")
      .select("id, nome_completo, email")
      .in("id", ids);
    if (e2) throw e2;
    return (perfis ?? []).map((p) => ({
      user_id: p.id,
      nome_completo: p.nome_completo,
      email: p.email,
    }));
  });

/* ------------------------------------------------------------------ */
/* Conceder papel de administrador                                    */
/* ------------------------------------------------------------------ */

export const concederAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: data.userId, role: "superadmin" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    if (error) throw error;
    await registrarAuditoria(
      context.userId,
      "conceder_admin",
      data.userId,
      "Papel de administrador concedido",
    );
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Revogar papel de administrador                                     */
/* ------------------------------------------------------------------ */

export const revogarAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context as unknown as AuthedContext);
    if (data.userId === context.userId) {
      throw new Error("Você não pode remover seu próprio acesso de administrador.");
    }
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    // Impede remover o último administrador do sistema.
    const { data: todos } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "superadmin");
    if ((todos ?? []).length <= 1) {
      throw new Error("É necessário manter ao menos um administrador.");
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "superadmin");
    if (error) throw error;
    await registrarAuditoria(
      context.userId,
      "revogar_admin",
      data.userId,
      "Papel de administrador revogado",
    );
    return { ok: true };
  });
