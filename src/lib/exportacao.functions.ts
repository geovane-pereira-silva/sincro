import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { temPapel, empresaDoUsuario, type AuthedCtx } from "@/lib/gestao-auth";
import { zonedWallToUtc } from "@/lib/ponto";

export interface PontoExportRow {
  id: string;
  user_id: string;
  tipo: string;
  data_hora: string;
  data_hora_original: string;
  foi_editado: boolean;
  justificativa: string | null;
  origem: string;
  created_at: string;
}

export interface ExportacaoPontos {
  profile: {
    id: string;
    nome: string;
    email: string;
    timezone: string;
    carga_horaria_diaria: number;
  };
  registros: PontoExportRow[];
}

/**
 * Exporta os pontos de um usuário num período. Acesso: superadmin, o próprio
 * usuário, ou o gestor da empresa à qual o usuário está vinculado como colaborador.
 */
export const exportarPontosPeriodo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { userId: string; inicio: string; fim: string }) => input,
  )
  .handler(async ({ data, context }): Promise<ExportacaoPontos> => {
    const ctx = context as unknown as AuthedCtx;
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Autorização
    let autorizado = data.userId === ctx.userId;
    if (!autorizado && (await temPapel(ctx, "superadmin"))) autorizado = true;
    if (!autorizado && (await temPapel(ctx, "gestor"))) {
      const empresa = await empresaDoUsuario(supabaseAdmin, ctx.userId);
      if (empresa) {
        const { data: col } = await supabaseAdmin
          .from("colaboradores")
          .select("id")
          .eq("empresa_id", empresa)
          .eq("user_id", data.userId)
          .maybeSingle();
        if (col) autorizado = true;
      }
    }
    if (!autorizado) throw new Error("Forbidden");

    const { data: perfil, error: ep } = await supabaseAdmin
      .from("profiles")
      .select("id, nome_completo, email, timezone, carga_horaria_diaria")
      .eq("id", data.userId)
      .maybeSingle();
    if (ep) throw new Error(ep.message);
    if (!perfil) throw new Error("Usuário não encontrado.");

    const tz = perfil.timezone || "America/Sao_Paulo";
    const [ai, mi, di] = data.inicio.split("-").map(Number);
    const [af, mf, df] = data.fim.split("-").map(Number);
    const inicioUtc = zonedWallToUtc(ai, mi, di, 0, 0, 0, tz).toISOString();
    const fimUtc = zonedWallToUtc(af, mf, df, 23, 59, 59, tz).toISOString();

    const { data: registros, error: er } = await supabaseAdmin
      .from("ponto_registros")
      .select(
        "id, user_id, tipo, data_hora, data_hora_original, foi_editado, justificativa, origem, created_at",
      )
      .eq("user_id", data.userId)
      .gte("data_hora", inicioUtc)
      .lte("data_hora", fimUtc)
      .order("data_hora", { ascending: true });
    if (er) throw new Error(er.message);

    return {
      profile: {
        id: perfil.id,
        nome: perfil.nome_completo ?? perfil.email,
        email: perfil.email,
        timezone: tz,
        carga_horaria_diaria: perfil.carga_horaria_diaria,
      },
      registros: (registros ?? []) as PontoExportRow[],
    };
  });
