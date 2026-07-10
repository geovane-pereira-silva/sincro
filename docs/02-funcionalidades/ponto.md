# Marcação de Ponto

## O que é
Registro eletrônico das batidas de ponto (entrada, intervalo, saída) do
usuário, com cálculo de jornada e saldo de horas.

## O que ele faz
- Registra batidas do dia com data/hora e, quando exigido, geolocalização.
- Suporta **múltiplos pontos**: 4 por padrão, expandindo em pares (6, 8, 10)
  conforme o usuário registra mais batidas.
- **Ordenação automática:** mesmo que o usuário inverta entrada/saída, o
  sistema ordena por horário e reatribui os papéis corretamente.
- Autônomos podem **inserir/editar** pontos manualmente no relatório.
- Cálculo de saldo, faltas e status do dia; **dias futuros não geram falta
  nem saldo negativo**.

## Como funciona
- Rota: `src/routes/_authenticated/ponto.tsx` (batida) e
  `editar.$id.tsx`; editor de dia em `src/components/ponto-dia-editor.tsx`.
- Lógica: `src/lib/ponto.ts` (pares cronológicos, múltiplas batidas) e
  `src/lib/calculoTrabalhista.ts` (saldo, status `futuro`, faltas).
- Hooks: `use-registros`, `use-calculo-jornada`, `use-jornada-config`,
  `use-banco-horas`.
- Tabela principal: `ponto_registros` (inclui `latitude`, `longitude`,
  `distancia_empresa_metros` para auditoria).
- Na batida de colaboradores, valida geofencing (`validarLocalizacaoPonto`)
  antes de inserir.

## Dependências
- Depende de: autenticação/perfis, configuração de jornada, geolocalização.
- Alimenta: relatórios/exportação, banco de horas, solicitações de ajuste.

## Status
Em produção.
