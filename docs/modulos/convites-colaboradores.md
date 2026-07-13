# Módulo: Convites de Colaboradores

## O que é
Fluxo de convite para colaboradores ingressarem em uma empresa e criarem conta
vinculada.

## Como funciona
1. Gestor/admin envia convite por email (Edge/Resend); fallback copia o link.
2. Colaborador acessa `/convite/$token` (stepper) e cria a conta.
3. `handle_new_user` vincula `colaboradores.user_id` por email/empresa.

## Quem usa
Gestor e admin (envio); colaborador (aceite).

## Regras de negócio
- Reenvio regenera o token.
- Estados: pendente, expirado, já usado — com UX específica.

## Tabelas do banco envolvidas
`colaboradores`, `profiles`, `empresas`.

## Rotas do sistema
`/convite/$token`; envio a partir da página da empresa.

## Configurações
`RESEND_API_KEY` para envio de email.

## Observações técnicas
`src/lib/convite.functions.ts`, `cadastro.functions.ts`, `email.server.ts`;
`convite-colaborador-dialog.tsx`; hook `use-convite-actions`.
