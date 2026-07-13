# Sistema Premium

## O que é
Controle de acesso a recursos premium, concedido por assinatura paga ou por
recompensas de gamificação.

## Como funciona
1. Recursos premium ficam atrás de um gate (`premium-gate`).
2. Acesso é concedido por assinatura ativa (Asaas) ou por `premium_access`.
3. Modais de upsell incentivam a conversão quando o recurso é bloqueado.

## Quem usa
Autônomo e empresas (via assinatura).

## Regras de negócio
- Acesso premium válido enquanto houver assinatura ativa ou `premium_access`
  dentro da validade.
- Recompensas de gamificação concedem premium temporário.

## Tabelas do banco envolvidas
`premium_access`, `assinaturas`, `user_plans`.

## Rotas do sistema
`/planos`, banners/modais de upsell em várias telas.

## Configurações
Planos e preços (admin).

## Observações técnicas
`src/lib/premium.ts`, `premium-context.tsx`, `premium-gate.tsx`,
`upsell-modal.tsx`; hook `use-premium`.
