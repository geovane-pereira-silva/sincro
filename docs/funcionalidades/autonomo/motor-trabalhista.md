# Motor Trabalhista

## O que é
Camada de cálculo que transforma batidas em saldo de horas, faltas e status do
dia, respeitando a jornada configurada.

## Como funciona
1. Lê as batidas do dia e forma pares cronológicos (entrada→saída).
2. Soma o tempo trabalhado e compara com a carga horária diária.
3. Classifica o dia (trabalhado, falta, dia especial, futuro).
4. Consolida o saldo do período.

## Quem usa
Autônomo, colaborador, gestor (relatórios) e admin.

## Regras de negócio
- Dias **futuros** retornam 0 (status `futuro`) — não penalizam o saldo.
- Dias especiais (`dias_especiais`) alteram o cálculo (feriado, atestado, etc.).
- Suporta jornada configurável por dia/carga horária.

## Tabelas do banco envolvidas
`ponto_registros`, `jornada_config`, `jornadas_empresa`, `dias_especiais`.

## Rotas do sistema
Usado por `/relatorio`, `/historico`, `/gestor`, `/admin/*`.

## Configurações
Carga horária diária e jornada por perfil/empresa.

## Observações técnicas
`src/lib/calculoTrabalhista.ts`; hooks `use-calculo-jornada`, `use-banco-horas`.
