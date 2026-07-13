# Aprovação de Solicitações — Gestor

## O que é
Fluxo do gestor para aprovar ou rejeitar solicitações dos colaboradores da
empresa.

## Como funciona
1. Gestor lista as solicitações da empresa em `/gestor/solicitacoes`.
2. Aprova ou rejeita com feedback (`resposta_gestor`).
3. Aprovação atualiza `ponto_registros` (ajustes) ou `dias_especiais`
   (abono/férias/folga) e gera notificação + log de auditoria.

## Quem usa
Gestor.

## Regras de negócio
- Somente solicitações da própria empresa (RLS).
- Aprovar férias/folga insere dias em `dias_especiais` do colaborador.

## Tabelas do banco envolvidas
`solicitacoes`, `ponto_registros`, `dias_especiais`, `notificacoes`,
`admin_audit_log`.

## Rotas do sistema
`/gestor/solicitacoes`.

## Configurações
Filtros por status/tipo.

## Observações técnicas
`src/lib/solicitacoes-actions.functions.ts` (`aprovarSolicitacao`,
`rejeitarSolicitacao`); hook `use-solicitacoes`.
