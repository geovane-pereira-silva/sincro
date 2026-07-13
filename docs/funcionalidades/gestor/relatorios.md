# Relatórios — Gestor

## O que é
Relatórios e espelhos de ponto da equipe, com exportação por período.

## Como funciona
1. Gestor consulta os pontos dos colaboradores da empresa.
2. Filtra por período/colaborador.
3. Exporta em CSV e PDF.

## Quem usa
Gestor (equipe); admin (global).

## Regras de negócio
- Escopo restrito à empresa do gestor (RLS).
- Cálculo de saldo segue o motor trabalhista.

## Tabelas do banco envolvidas
`ponto_registros`, `colaboradores`, `jornadas_empresa`, `dias_especiais`.

## Rotas do sistema
`/gestor`, `/admin/relatorios`, `/admin/exportar`.

## Configurações
Filtros de relatório.

## Observações técnicas
`src/lib/relatorios.ts`, `exportacao.functions.ts`, `pdf-export.ts`;
componentes em `src/components/relatorios/*`.
