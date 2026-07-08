// Autorização compartilhada para ações de gestão de empresa.
// Client-safe: não importa módulos *.server diretamente — recebe o client
// admin já resolvido pelo handler da server function.

export interface AuthedCtx {
  supabase: {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
  };
  userId: string;
}

interface AdminClient {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
      };
    };
  };
}

/** Verifica se o usuário logado possui um papel específico (via has_role). */
export async function temPapel(ctx: AuthedCtx, papel: string): Promise<boolean> {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: papel,
  });
  return !error && data === true;
}

/** Empresa vinculada ao perfil do usuário logado. */
export async function empresaDoUsuario(
  admin: unknown,
  userId: string,
): Promise<string | null> {
  const client = admin as AdminClient;
  const { data } = await client
    .from("profiles")
    .select("empresa_id")
    .eq("id", userId)
    .maybeSingle();
  return (data?.empresa_id as string | undefined) ?? null;
}

/** Empresa dona de um registro de uma tabela com coluna empresa_id. */
export async function empresaDoRegistro(
  admin: unknown,
  tabela: string,
  id: string,
): Promise<string | null> {
  const client = admin as AdminClient;
  const { data } = await client
    .from(tabela)
    .select("empresa_id")
    .eq("id", id)
    .maybeSingle();
  return (data?.empresa_id as string | undefined) ?? null;
}

/**
 * Autoriza a gestão de uma empresa específica: libera superadmin ou o gestor
 * cujo perfil está vinculado à mesma empresa. Lança "Forbidden" caso contrário.
 */
export async function assertGestaoEmpresa(
  ctx: AuthedCtx,
  admin: unknown,
  empresaId: string | null,
): Promise<void> {
  if (await temPapel(ctx, "superadmin")) return;
  if (empresaId && (await temPapel(ctx, "gestor"))) {
    const emp = await empresaDoUsuario(admin, ctx.userId);
    if (emp && emp === empresaId) return;
  }
  throw new Error("Forbidden");
}

/** Autoriza superadmin ou qualquer gestor (sem escopo de empresa). */
export async function assertSuperadminOuGestor(ctx: AuthedCtx): Promise<void> {
  if (await temPapel(ctx, "superadmin")) return;
  if (await temPapel(ctx, "gestor")) return;
  throw new Error("Forbidden");
}
