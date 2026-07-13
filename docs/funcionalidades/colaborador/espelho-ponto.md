# Espelho de Ponto — Colaborador

## O que é
Relatório mensal das batidas do colaborador, com saldo do período, layout
responsivo e exportação.

## Como funciona
1. Colaborador acessa `/relatorio` e escolhe o período.
2. O espelho mostra todos os pontos do dia (4 colunas por padrão, até 10).
3. Layout responsivo: tabela no desktop, cards no mobile.
4. Exportação em CSV e PDF.

## Quem usa
Colaborador (próprio); gestor (da equipe).

## Regras de negócio
- Mostra todas as batidas do dia, não só entrada/saída.
- Dias futuros não contam como falta/negativo.
- (BLOCO B2) Assinatura eletrônica do espelho — PENDENTE.

## Tabelas do banco envolvidas
`ponto_registros`, `jornada_config`, `dias_especiais`.

## Rotas do sistema
`/relatorio`, `/historico`.

## Configurações
Filtros de período.

## Observações técnicas
`src/routes/_authenticated/relatorio.tsx`, `src/lib/ponto-export.ts`,
`src/lib/pdf-export.ts`.
