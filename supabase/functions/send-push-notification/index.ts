// Edge function: send-push-notification
// Envia notificações Web Push (VAPID) para os dispositivos de um usuário.
// Protegida por um segredo interno (x-internal-secret) — destinada a ser
// chamada por outras funções de servidor / cron internos, nunca pelo browser.

import webpush from "npm:web-push@3.6.7";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contato@sincroapp.com";
const INTERNAL_SECRET = Deno.env.get("PUSH_INTERNAL_SECRET")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const provided = req.headers.get("x-internal-secret");
  if (!provided || provided !== INTERNAL_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const userId: string = body.user_id;
    const titulo: string = body.titulo ?? "SINCRO";
    const mensagem: string = body.mensagem ?? "";
    const link: string = body.link ?? "/ponto";
    const tag: string = body.tag ?? "lembrete-ponto";

    if (!userId) {
      return new Response(JSON.stringify({ error: "user_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (error) throw error;

    const payload = JSON.stringify({ titulo, mensagem, link, tag });
    let enviados = 0;
    const remover: string[] = [];

    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        enviados++;
      } catch (e) {
        // 404/410 => subscription expirada: agenda remoção.
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) remover.push(s.id);
      }
    }

    if (remover.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", remover);
    }

    return new Response(
      JSON.stringify({ ok: true, enviados, removidos: remover.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "erro" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
