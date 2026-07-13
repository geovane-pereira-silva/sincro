# Banco de Horas

## O que é
Acúmulo do saldo de horas (positivo/negativo) ao longo do período, derivado do
motor trabalhista.

## Como funciona
1. A cada dia trabalhado, o saldo diário é somado ao acumulado.
2. O saldo do período é exibido no relatório e no card de status.
3. Dias futuros não afetam o acumulado.

## Quem usa
Autônomo e colaborador (visualização); gestor (equipe).

## Regras de negócio
- Saldo = trabalhado − previsto, por dia, acumulado no período.
- Folgas compensatórias descontam do banco de horas (ver férias/folgas).

## Tabelas do banco envolvidas
`ponto_registros`, `jornada_config`, `dias_especiais`.

## Rotas do sistema
`/relatorio`, `/historico`.

## Configurações
Carga horária diária.

## Observações técnicas
Hook `use-banco-horas`; cálculo em `src/lib/calculoTrabalhista.ts`.
