import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type AuthedCtx } from "@/lib/gestao-auth";

async function assertSuperadmin(ctx: AuthedCtx): Promise<void> {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "superadmin",
  });
  if (error || data !== true) throw new Error("Forbidden");
}

function gerarSenhaProvisoria(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(10);
  crypto.getRandomValues(arr);
  let s = "";
  for (const n of arr) s += chars[n % chars.length];
  // Garante ao menos um dígito e um símbolo para atender políticas de senha.
  return `${s}#7`;
}

async function auditar(
  adminId: string,
  acao: string,
  registroId: string,
  motivo: string,
): Promise<void> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: adminId,
    acao,
    tabela: "empresas",
    registro_id: registroId,
    dados_anteriores: null as never,
    motivo,
  });
}

export interface GestorInfo {
  userId: string;
  nome: string;
  email: string;
}

/** Retorna o gestor vinculado à empresa (via admin_user_id), se houver. */
export const infoGestorEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { empresaId: string }) => input)
  .handler(async ({ data, context }): Promise<GestorInfo | null> => {
    await assertSuperadmin(context as unknown as AuthedCtx);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: emp } = await supabaseAdmin
      .from("empresas")
      .select("admin_user_id")
      .eq("id", data.empresaId)
      .maybeSingle();
    if (!emp?.admin_user_id) return null;
    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("id, nome_completo, email")
      .eq("id", emp.admin_user_id)
      .maybeSingle();
    if (!perfil) return null;
    return {
      userId: perfil.id,
      nome: perfil.nome_completo ?? perfil.email,
      email: perfil.email,
    };
  });

export interface CredenciaisGestor {
  email: string;
  senha: string;
  userId: string;
}

/**
 * Cria a conta de gestor da empresa com login próprio e senha provisória.
 * A senha é retornada UMA ÚNICA VEZ para o superadmin repassar.
 */
export const criarGestorEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { empresaId: string; nome: string; email: string }) => input,
  )
  .handler(async ({ data, context }): Promise<CredenciaisGestor> => {
    await assertSuperadmin(context as unknown as AuthedCtx);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const email = data.email.trim().toLowerCase();
    const nome = data.nome.trim();
    if (!email || !nome) throw new Error("Informe nome e e-mail do gestor.");

    const { data: emp } = await supabaseAdmin
      .from("empresas")
      .select("id, nome, admin_user_id")
      .eq("id", data.empresaId)
      .maybeSingle();
    if (!emp) throw new Error("Empresa não encontrada.");
    if (emp.admin_user_id) {
      throw new Error("Esta empresa já possui um gestor. Redefina a senha do gestor existente.");
    }

    const senha = gerarSenhaProvisoria();
    const { data: created, error: eCreate } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: {
          full_name: nome,
          tipo_conta: "gestor",
          empresa_id: data.empresaId,
        },
      });
    if (eCreate || !created?.user) {
      const msg = eCreate?.message ?? "Erro ao criar conta do gestor.";
      if (/registered|exists|already/i.test(msg)) {
        throw new Error("Já existe uma conta com este e-mail.");
      }
      throw new Error(msg);
    }
    const userId = created.user.id;

    // Garante perfil consistente (a trigger já cria; reforçamos os campos).
    await supabaseAdmin
      .from("profiles")
      .update({
        tipo_conta: "gestor",
        empresa_id: data.empresaId,
        nome_completo: nome,
      } as never)
      .eq("id", userId);

    // Concede papel de gestor.
    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "gestor" } as never,
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );

    // Vincula a empresa ao gestor.
    await supabaseAdmin
      .from("empresas")
      .update({ admin_user_id: userId } as never)
      .eq("id", data.empresaId);

    await auditar(
      context.userId,
      "criar_gestor_empresa",
      data.empresaId,
      `Gestor criado: ${email}`,
    );

    return { email, senha, userId };
  });

/** Redefine a senha do gestor de uma empresa, retornando a nova senha uma vez. */
export const resetarSenhaGestor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; empresaId: string }) => input)
  .handler(async ({ data, context }): Promise<{ senha: string }> => {
    await assertSuperadmin(context as unknown as AuthedCtx);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const senha = gerarSenhaProvisoria();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      data.userId,
      { password: senha },
    );
    if (error) throw new Error(error.message);
    await auditar(
      context.userId,
      "resetar_senha_gestor",
      data.empresaId,
      "Senha do gestor redefinida",
    );
    return { senha };
  });
