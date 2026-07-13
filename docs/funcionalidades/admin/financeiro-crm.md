# Financeiro e CRM — Admin

## O que é
Gestão de assinaturas, cobrança via Asaas e acompanhamento comercial (CRM) do
SaaS.

## Como funciona
1. Planos e assinaturas são geridos no admin.
2. Eventos de cobrança do Asaas chegam por webhook e são persistidos.
3. Ferramenta admin permite testar/validar o webhook.

## Quem usa
Superadmin (admin master).

## Regras de negócio
- Acesso premium controlado por assinatura ativa.
- Eventos de webhook verificados antes de processar.

## Tabelas do banco envolvidas
`assinaturas`, `user_plans`, `asaas_webhook_eventos`, `crm_eventos`,
`premium_access`.

## Rotas do sistema
`/admin/financeiro`, `/admin/premium`, `/admin/webhook`;
webhook `/api/public/asaas/webhook`.

## Configurações
Planos, preços, credenciais Asaas (secrets).

## Observações técnicas
`src/lib/asaas*.ts`, `assinaturas.{functions,server}.ts`,
`asaas-webhook.functions.ts`; hooks `use-financeiro`, `use-asaas-webhook`.
