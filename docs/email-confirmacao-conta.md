# E-mail de confirmação de conta — SINCRO

O e-mail de confirmação de cadastro é enviado pelo **serviço de autenticação**
(Supabase Auth), e não pela aplicação. Por isso ele **não pode ser trocado por
migração de banco** — o template vive nas configurações de Auth.

## Situação atual

- A confirmação de e-mail está **ativada** (o usuário precisa clicar no link
  antes de acessar).
- O template usado é o padrão genérico do provedor de autenticação.

## Como customizar

Há dois caminhos:

### Opção A — Templates de e-mail gerenciados pelo provedor (recomendado)

Requer um **domínio de e-mail verificado** no projeto (Cloud → Emails). Depois
de configurado, os 6 templates de autenticação (incluindo confirmação de conta)
passam a ser gerenciados e podem receber a identidade visual do SINCRO
automaticamente. Peça para ativar os "e-mails de autenticação" que o fluxo é
disparado.

### Opção B — Colar o template manualmente (caso tenha acesso ao painel de Auth)

No painel de autenticação, em **Authentication → Email Templates → Confirm
signup**, cole:

**Assunto:**

```
Confirme sua conta no SINCRO
```

**Corpo (HTML):**

```html
<div style="max-width:520px;margin:0 auto;padding:32px 24px;font-family:Arial,Helvetica,sans-serif;color:#0f1f33;">
  <div style="text-align:center;margin-bottom:24px;">
    <span style="font-size:22px;font-weight:800;letter-spacing:1px;color:#1E3A5F;">SINCRO</span>
  </div>
  <div style="border:1px solid #e5e9f0;border-radius:16px;padding:28px 24px;">
    <h1 style="font-size:19px;font-weight:800;color:#1E3A5F;margin:0 0 12px;">
      Olá! Sua conta está quase pronta.
    </h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">
      Confirme seu e-mail para ativar sua conta no SINCRO.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{ .ConfirmationURL }}"
         style="display:inline-block;background:#1E3A5F;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:12px;">
        Confirmar minha conta →
      </a>
    </div>
    <p style="font-size:13px;color:#8a97a8;line-height:1.5;margin:0;">
      Se você não criou uma conta no SINCRO, ignore este e-mail.
    </p>
  </div>
</div>
```

> Observação: o token de nome de usuário (`USERNAME`) não está disponível como
> variável nativa no template de confirmação do provedor. O texto usa uma
> saudação genérica ("Olá!"). Para personalizar com o nome/usuário, use a
> Opção A (templates gerenciados), que suportam variáveis de template.
