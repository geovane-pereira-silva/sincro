// Envio de e-mails transacionais do SINCRO via Resend.
// Server-only: nunca importar em código de cliente. A RESEND_API_KEY vive
// apenas no servidor (process.env) e nunca é exposta ao browser.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function remetente(): string {
  // RESEND_FROM permite usar um domínio verificado (ex.: "SINCRO <nao-responder@seudominio.com>").
  // Sem domínio verificado, o Resend só entrega para o dono da conta usando onboarding@resend.dev.
  return process.env.RESEND_FROM || "SINCRO <onboarding@resend.dev>";
}

async function enviar(payload: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY não configurada.");

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: remetente(),
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detalhe}`);
  }
}

function layout(inner: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#0f1f33;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="display:inline-block;font-size:22px;font-weight:800;letter-spacing:1px;color:#1E3A5F;">SINCRO</span>
    </div>
    <div style="border:1px solid #e5e9f0;border-radius:16px;padding:28px 24px;">
      ${inner}
    </div>
    <p style="text-align:center;font-size:12px;color:#8a97a8;margin-top:20px;">
      SINCRO — controle de jornada
    </p>
  </div>
</body></html>`;
}

function botao(href: string, texto: string): string {
  return `<a href="${href}" style="display:inline-block;background:#1E3A5F;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:12px;">${texto}</a>`;
}

/** E-mail de convite de colaborador com link pré-preenchido. */
export async function enviarConviteEmail(params: {
  email: string;
  nome: string;
  empresaNome: string;
  link: string;
}): Promise<void> {
  const primeiro = params.nome.split(" ")[0] || params.nome;
  const html = layout(`
    <h1 style="font-size:19px;font-weight:800;color:#1E3A5F;margin:0 0 12px;">Olá, ${primeiro}!</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 8px;">
      A <strong>${params.empresaNome}</strong> usa o SINCRO para controle de jornada e te convidou para criar sua conta.
    </p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">
      Seus dados já estão preenchidos — é só definir uma senha.
    </p>
    <div style="text-align:center;margin:24px 0;">
      ${botao(params.link, "Criar minha conta →")}
    </div>
    <p style="font-size:13px;color:#8a97a8;line-height:1.5;margin:0;">
      Este convite é válido por 7 dias. Se você não esperava este e-mail, pode ignorá-lo.
    </p>
  `);
  await enviar({
    to: params.email,
    subject: `${params.empresaNome} te convidou para o SINCRO`,
    html,
  });
}

/** Notifica o admin da empresa que um colaborador pediu um novo convite. */
export async function notificarAdminNovoConvite(params: {
  adminEmail: string;
  empresaNome: string;
  colaboradorNome: string;
  colaboradorEmail: string;
}): Promise<void> {
  const html = layout(`
    <h1 style="font-size:19px;font-weight:800;color:#1E3A5F;margin:0 0 12px;">Novo pedido de convite</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 8px;">
      <strong>${params.colaboradorNome}</strong> (${params.colaboradorEmail}) solicitou um novo convite
      para acessar o SINCRO como colaborador de <strong>${params.empresaNome}</strong>.
    </p>
    <p style="font-size:15px;line-height:1.6;margin:0;">
      Acesse o painel administrativo para reenviar o convite.
    </p>
  `);
  await enviar({
    to: params.adminEmail,
    subject: `Pedido de novo convite — ${params.empresaNome}`,
    html,
  });
}
