# Módulo: Pagamento (Asaas)

## O que é
Integração de cobrança/assinaturas via Asaas, com webhook para eventos de
pagamento.

## Como funciona
1. Assinaturas geridas no app/admin.
2. Asaas envia eventos ao webhook público.
3. O handler verifica o chamador e persiste o evento.

## Quem usa
Admin (gestão); todos (assinantes).

## Regras de negócio
- Webhook em rota pública, com verificação do chamador antes de processar.
- Eventos persistidos para auditoria.

## Tabelas do banco envolvidas
`assinaturas`, `user_plans`, `asaas_webhook_eventos`.

## Rotas do sistema
`/api/public/asaas/webhook`; `/admin/webhook` (teste), `/planos`.

## Configurações
Credenciais Asaas como secrets.

## Observações técnicas
`src/lib/asaas.server.ts`, `asaas.ts`, `asaas-webhook.functions.ts`;
`src/routes/api/public/asaas/webhook.ts`.
