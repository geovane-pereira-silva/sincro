// Ações de gestor sobre solicitações (aprovar/rejeitar) com autorização
// server-side. Usa o client admin para aplicar mudanças que a RLS do
// colaborador não permitiria (ponto de outro usuário, dias especiais).

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type AuthedCtx } from "@/lib/gestao-auth";
import { zonedWallToUtc } from "@/lib/ponto";

async function papel(ctx: AuthedCtx, role: string): Promise<boolean> {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: role,
  });
  return !error && data === true;
}

interface Resultado {
  ok: true;
}

/** Aprova uma solicitação e aplica os efeitos correspondentes. */
export const aprovarSolicitacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; observacao?: string }) => input)
  .handler(async ({ data, context }): Promise<Resultado> => {
    const ctx = context as unknown as AuthedCtx;
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: sol } = await supabaseAdmin
      .from("solicitacoes")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!sol) throw new Error("Solicitação não encontrada");

    // Autorização: superadmin OU gestor da mesma empresa.
    const isSuper = await papel(ctx, "superadmin");
    if (!isSuper) {
      const isGestor = await papel(ctx, "gestor");
      const { data: perfil } = await supabaseAdmin
        .from("profiles")
        .select("empresa_id")
        .eq("id", ctx.userId)
        .maybeSingle();
      if (!isGestor || perfil?.empresa_id !== sol.empresa_id) {
        throw new Error("Forbidden");
      }
    }

    // Perfil do colaborador (para fuso ao montar batidas).
    const { data: perfilColab } = await supabaseAdmin
      .from("profiles")
      .select("timezone")
      .eq("id", sol.user_id)
      .maybeSingle();
    const tz = perfilColab?.timezone ?? "America/Sao_Paulo";

    // Efeito: ajuste de ponto → cria/atualiza batida.
    if (sol.tipo === "ajuste_ponto" && sol.tipo_batida && sol.horario_solicitado) {
      const [y, m, d] = sol.data_referencia.split("-").map(Number);
      const [hh, mm] = sol.horario_solicitado.split(":").map(Number);
      const dataHora = zonedWallToUtc(y, m, d, hh, mm, 0, tz);

      // Verifica se já existe uma batida do mesmo tipo no dia.
      const start = zonedWallToUtc(y, m, d, 0, 0, 0, tz);
      const end = new Date(start.getTime() + 24 * 3600 * 1000);
      const { data: existentes } = await supabaseAdmin
        .from("ponto_registros")
        .select("id")
        .eq("user_id", sol.user_id)
        .eq("tipo", sol.tipo_batida)
        .gte("data_hora", start.toISOString())
        .lt("data_hora", end.toISOString());

      if (existentes && existentes.length > 0) {
        await supabaseAdmin
          .from("ponto_registros")
          .update({
            data_hora: dataHora.toISOString(),
            foi_editado: true,
            justificativa: `Ajuste aprovado: ${sol.motivo}`,
          })
          .eq("id", existentes[0].id);
      } else {
        await supabaseAdmin.from("ponto_registros").insert({
          user_id: sol.user_id,
          tipo: sol.tipo_batida,
          data_hora: dataHora.toISOString(),
          data_hora_original: dataHora.toISOString(),
          foi_editado: true,
          justificativa: `Ajuste aprovado: ${sol.motivo}`,
          origem: "solicitacao",
        });
      }
    }

    // Efeito: abono/folga/férias → registra dias especiais no período.
    if (["abono", "folga", "ferias"].includes(sol.tipo)) {
      const inicio = sol.data_inicio ?? sol.data_referencia;
      const fim = sol.data_fim ?? sol.data_referencia;
      const dias: string[] = [];
      const cur = new Date(`${inicio}T12:00:00Z`);
      const last = new Date(`${fim}T12:00:00Z`);
      while (cur.getTime() <= last.getTime() && dias.length < 366) {
        dias.push(cur.toISOString().slice(0, 10));
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      const tipoDia =
        sol.tipo === "ferias" ? "ferias" : sol.tipo === "folga" ? "folga" : "abono";
      for (const dia of dias) {
        await supabaseAdmin.from("dias_especiais").insert({
          user_id: sol.user_id,
          empresa_id: sol.empresa_id,
          data: dia,
          tipo: tipoDia,
          descricao: sol.motivo,
          solicitacao_id: sol.id,
        });
      }
    }

    await supabaseAdmin
      .from("solicitacoes")
      .update({
        status: "aprovado",
        gestor_id: ctx.userId,
        respondido_em: new Date().toISOString(),
        resposta_gestor: data.observacao?.trim() || null,
      })
      .eq("id", sol.id);

    await supabaseAdmin.from("notificacoes").insert({
      user_id: sol.user_id,
      tipo: "solicitacao_aprovada",
      titulo: "Solicitação aprovada",
      mensagem: `Sua solicitação de ${sol.tipo.replace("_", " ")} foi aprovada.`,
      link: "/solicitacoes",
    });

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_id: ctx.userId,
      acao: "aprovar_solicitacao",
      tabela: "solicitacoes",
      registro_id: sol.id,
      dados_anteriores: null as never,
      motivo: data.observacao?.trim() || "Aprovada",
    });

    return { ok: true };
  });

/** Rejeita uma solicitação com motivo obrigatório. */
export const rejeitarSolicitacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; motivo: string }) => input)
  .handler(async ({ data, context }): Promise<Resultado> => {
    const ctx = context as unknown as AuthedCtx;
    if (!data.motivo?.trim()) throw new Error("Motivo obrigatório");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: sol } = await supabaseAdmin
      .from("solicitacoes")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!sol) throw new Error("Solicitação não encontrada");

    const isSuper = await papel(ctx, "superadmin");
    if (!isSuper) {
      const isGestor = await papel(ctx, "gestor");
      const { data: perfil } = await supabaseAdmin
        .from("profiles")
        .select("empresa_id")
        .eq("id", ctx.userId)
        .maybeSingle();
      if (!isGestor || perfil?.empresa_id !== sol.empresa_id) {
        throw new Error("Forbidden");
      }
    }

    await supabaseAdmin
      .from("solicitacoes")
      .update({
        status: "rejeitado",
        gestor_id: ctx.userId,
        respondido_em: new Date().toISOString(),
        resposta_gestor: data.motivo.trim(),
      })
      .eq("id", sol.id);

    await supabaseAdmin.from("notificacoes").insert({
      user_id: sol.user_id,
      tipo: "solicitacao_rejeitada",
      titulo: "Solicitação rejeitada",
      mensagem: `Sua solicitação de ${sol.tipo.replace("_", " ")} foi rejeitada.`,
      link: "/solicitacoes",
    });

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_id: ctx.userId,
      acao: "rejeitar_solicitacao",
      tabela: "solicitacoes",
      registro_id: sol.id,
      dados_anteriores: null as never,
      motivo: data.motivo.trim(),
    });

    return { ok: true };
  });

// getZonedParts é reexportado apenas para manter o import consistente com o
// motor de fuso; usado indiretamente por zonedWallToUtc.
void getZonedParts;
