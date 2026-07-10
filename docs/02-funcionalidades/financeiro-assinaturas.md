# Financeiro e Assinaturas

## O que é
Monetização do SaaS: planos, assinaturas e cobrança via **Asaas**, além de
recursos premium controlados por gate.

## O que ele faz
- Exibe planos (`/planos`) e gerencia a assinatura do usuário/empresa.
- Recebe eventos de cobrança do Asaas via webhook e persiste logs.
- Ferramenta admin para testar/validar o webhook do Asaas.
- Controle de acesso premium via contexto/gate (upsell modais e banners).
- Painel financeiro no admin.

## Como funciona
- Webhook público: `src/routes/api/public/asaas/webhook.ts` (verifica o
  chamador). Testes: `admin/webhook.index.tsx`.
- Server/libs: `src/lib/asaas.server.ts`, `asaas.ts`,
  `asaas-webhook.functions.ts`, `assinaturas.{functions,server}.ts`,
  `financeiro.ts`, `premium.ts`.
- Componentes: `checkout-modal.tsx`, `minha-assinatura-card.tsx`,
  `premium-context.tsx`, `premium-gate.tsx`, `upsell-modal.tsx`,
  `home-upsell-banner.tsx`.
- Hooks: `use-assinatura`, `use-financeiro`, `use-premium`, `use-asaas-webhook`.
- Tabela de eventos: `asaas_webhook_eventos`.

## Dependências
- Depende de: autenticação/perfis, empresas.
- Controla acesso de: recursos premium em vários módulos.

## Status
Em produção.
