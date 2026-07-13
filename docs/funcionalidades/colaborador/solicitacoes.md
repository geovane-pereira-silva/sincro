# Solicitações — Colaborador

## O que é
Fluxo pelo qual o colaborador pede ajustes e exceções de jornada (ajuste de
ponto, abono, hora extra, férias, folga) para aprovação do gestor.

## Como funciona
1. Colaborador abre uma solicitação em modal de 3 passos (tipo → detalhes/anexo
   → revisão).
2. Pode anexar arquivo (ex.: atestado) e acompanhar/cancelar suas solicitações.
3. O gestor aprova ou rejeita; a aprovação atualiza ponto/dias especiais.

## Quem usa
Colaborador (abre); gestor (decide).

## Regras de negócio
- Status: pendente, aprovado, rejeitado, cancelado.
- Aprovação de ajuste atualiza `ponto_registros`; abono/férias/folga atualiza
  `dias_especiais`.
- Gera notificação e log de auditoria.

## Tabelas do banco envolvidas
`solicitacoes`, `dias_especiais`, `notificacoes`; anexos no bucket
`anexos-solicitacoes`.

## Rotas do sistema
`/solicitacoes` (colaborador), `/gestor/solicitacoes` (gestor).

## Configurações
Tipos exigidos e prazos podem depender da empresa.

## Observações técnicas
`src/lib/solicitacoes.ts`, `solicitacoes-actions.functions.ts`;
`nova-solicitacao-dialog.tsx`; hook `use-solicitacoes`.
