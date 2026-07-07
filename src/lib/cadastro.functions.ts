import { createServerFn } from "@tanstack/react-start";

const USERNAME_RE = /^[A-Z0-9._]{3,30}$/;

/**
 * Verifica disponibilidade de um username. Endpoint público (usado durante o
 * cadastro, antes do login). Retorna apenas booleanos — nunca lista usuários.
 */
export const checkUsername = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string }) => input)
  .handler(async ({ data }) => {
    const u = (data.username ?? "").trim().toUpperCase();
    if (!USERNAME_RE.test(u)) {
      return { valid: false, available: false };
    }
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { count, error } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("username", u);
    if (error) throw new Error(error.message);
    return { valid: true, available: (count ?? 0) === 0 };
  });

/**
 * Valida se uma empresa existe pelo nome exato (case-insensitive).
 * Endpoint público — nunca retorna lista de empresas, apenas a confirmação
 * da que foi digitada.
 */
export const checkEmpresa = createServerFn({ method: "POST" })
  .inputValidator((input: { nome: string }) => input)
  .handler(async ({ data }) => {
    const nome = (data.nome ?? "").trim();
    if (nome.length < 3) return { found: false as const };
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: rows, error } = await supabaseAdmin
      .from("empresas")
      .select("id, nome")
      .ilike("nome", nome)
      .eq("ativo", true)
      .limit(1);
    if (error) throw new Error(error.message);
    const emp = rows?.[0];
    if (!emp) return { found: false as const };
    return { found: true as const, id: emp.id, nome: emp.nome };
  });
