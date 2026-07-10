# Solicitações

## O que é
Fluxo pelo qual o colaborador pede ajustes e exceções de jornada (ajuste de
ponto, abono, hora extra, férias, folga) e o gestor aprova ou rejeita.

## O que ele faz
- Colaborador abre solicitação por um modal em 3 passos (tipo → detalhes/anexo
  → revisão), podendo anexar arquivo (atestado etc.).
- Colaborador acompanha e pode **cancelar** suas solicitações.
- Gestor lista as solicitações da empresa e **aprova/rejeita** com feedback.
- Aprovação atualiza automaticamente `ponto_registros` (ajustes) ou
  `dias_especiais` (abonos/férias/folga), gera log de auditoria e notificação.

## Como funciona
- Tipos/rótulos: `src/lib/solicitacoes.ts`.
- Server functions: `src/lib/solicitacoes-actions.functions.ts`
  (`aprovarSolicitacao`, `rejeitarSolicitacao`).
- Hooks: `src/hooks/use-solicitacoes.ts` (minhas, empresa, criar, cancelar,
  aprovar, rejeitar).
- UI: `nova-solicitacao-dialog.tsx`; rotas `solicitacoes.tsx` (colaborador) e
  `gestor.solicitacoes.tsx` (gestor).
- Tabelas: `solicitacoes` (campo de feedback `resposta_gestor`),
  `dias_especiais`. Anexos no bucket privado `anexos-solicitacoes`.

## Dependências
- Depende de: autenticação/perfis, empresas-gestor, ponto.
- Alimenta: notificações (dispara ao criar/aprovar/rejeitar), relatórios.

## Status
Em produção.
