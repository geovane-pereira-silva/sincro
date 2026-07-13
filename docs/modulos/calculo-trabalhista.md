# Módulo: Cálculo Trabalhista

## O que é
Núcleo de cálculo de jornada: saldo, faltas e status do dia a partir das
batidas.

## Como funciona
1. Forma pares cronológicos de batidas.
2. Soma tempo trabalhado e compara com a carga prevista.
3. Classifica o dia e acumula o saldo do período.

## Quem usa
Todos os módulos que exibem jornada (ponto, relatórios, gestor, admin).

## Regras de negócio
- Status `futuro` para dias após hoje (saldo 0, sem falta).
- Dias especiais alteram o cálculo.
- Ordenação automática das batidas.

## Tabelas do banco envolvidas
`ponto_registros`, `jornada_config`, `jornadas_empresa`, `dias_especiais`.

## Rotas do sistema
Consumido por `/relatorio`, `/historico`, `/gestor`, `/admin/*`.

## Configurações
Carga horária/jornada por perfil/empresa.

## Observações técnicas
`src/lib/calculoTrabalhista.ts`, `src/lib/ponto.ts`.
