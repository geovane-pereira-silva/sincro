# Deploy e Configuração de Ambiente

## O que é
Passos e requisitos para publicar o SINCRO e configurar integrações externas.

## Como funciona
- Publicação via Lovable Cloud. Produção: `sincroapp.lovable.app`.
- Preview estável: `project--<id>-dev.lovable.app`.
- Secrets configurados no backend (não em `.env` versionado).

## Quem usa
Admin master / responsável por deploy.

## Regras de negócio
- Secrets de runtime via ferramenta de secrets do backend.
- `RESEND_API_KEY` necessário para envio de emails.

## Tabelas do banco envolvidas
N/A.

## Rotas do sistema
Webhook Asaas: `/api/public/asaas/webhook`.

## Configurações

### SSO Microsoft (Azure AD) — PENDENTE (BLOCO B3)
1. Azure Portal → App registrations → registrar app.
2. Adicionar redirect URI do Supabase: `https://<ref>.supabase.co/auth/v1/callback`.
3. Copiar Application (client) ID e criar Client Secret.
4. No backend (Auth → Providers → Azure): informar client ID, secret e tenant.

### Apple Sign In — PENDENTE (BLOCO B3)
1. Apple Developer → criar Services ID com Sign In with Apple.
2. Criar Key (.p8) e anotar Key ID + Team ID.
3. Configurar domínio e return URL (callback do Supabase).
4. Gerar Client Secret JWT e informar no backend (Auth → Providers → Apple).

### Notificações Push (VAPID) — PENDENTE (BLOCO B7)
```bash
npx web-push generate-vapid-keys
# VITE_VAPID_PUBLIC_KEY=  (exposta no client)
# VAPID_PRIVATE_KEY=      (apenas no servidor/Edge Function)
```
Configurar como secrets; a Edge Function `send-push-notification` usa a chave
privada.

## Observações técnicas
Runtime edge/Worker: usar apenas libs compatíveis.
