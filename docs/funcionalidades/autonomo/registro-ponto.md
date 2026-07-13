# Registro de Ponto — Autônomo

## O que é
Marcação de batidas (entrada, intervalo, saída) pelo próprio autônomo, com
liberdade para inserir e editar pontos manualmente.

## Como funciona
1. Autônomo acessa `/ponto` e registra batidas do dia.
2. Pode abrir o relatório e adicionar/editar pontos manualmente por dia.
3. O sistema ordena as batidas por horário e reatribui papéis automaticamente.
4. Suporta múltiplos pontos: 4 por padrão, expandindo em pares até 10.

## Quem usa
Autônomo / individual.

## Regras de negócio
- Sem fluxo de aprovação — o autônomo edita tudo direto.
- Ordenação automática mesmo com entrada/saída invertidas.
- Dias futuros não geram falta nem saldo negativo.

## Tabelas do banco envolvidas
`ponto_registros`, `jornada_config`, `dias_especiais`.

## Rotas do sistema
`/ponto`, `/relatorio`, `/editar/$id`.

## Configurações
Jornada diária e timezone no perfil/config do usuário.

## Observações técnicas
Editor de dia: `src/components/ponto-dia-editor.tsx`; lógica em
`src/lib/ponto.ts`.
