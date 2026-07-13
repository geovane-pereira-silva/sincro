# Painel do Gestor

## O que é
Dashboard do gestor da empresa, com visão da equipe, solicitações pendentes e
acesso às configurações da empresa.

## Como funciona
1. Contas gestoras são redirecionadas de `/ponto` para `/gestor`.
2. O gestor vê o resumo da equipe e as solicitações a decidir.
3. Acessa aprovação de solicitações e configurações de empresa.

## Quem usa
Gestor.

## Regras de negócio
- Papel `gestor` com escopo por empresa via RLS.
- Gestor só acessa dados da própria empresa.

## Tabelas do banco envolvidas
`profiles`, `colaboradores`, `solicitacoes`, `empresas`, `ponto_registros`.

## Rotas do sistema
`/gestor`, `/gestor/solicitacoes`, `/gestor/configuracoes`.

## Configurações
Definidas nas telas de configuração da empresa.

## Observações técnicas
`gestor.index.tsx`; `gestor-empresa-card.tsx`; hook `use-gestor-admin`.
