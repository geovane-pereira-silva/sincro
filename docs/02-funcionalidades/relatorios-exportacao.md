# Relatórios e Exportação

## O que é
Espelho de ponto e relatórios de jornada, com exportação em CSV e PDF por
período, para o próprio usuário, para colaboradores e para o admin.

## O que ele faz
- Espelho de ponto mostra **todos os pontos** do dia (4 colunas por padrão,
  expandindo até 10 conforme as batidas).
- Layout **responsivo**: tabela clicável no desktop e cards no mobile (toda a
  informação visível na tela do celular).
- Exportação de pontos por período em CSV e PDF.
- Relatórios administrativos (empresas, financeiro, usuários, gamificação).

## Como funciona
- Rotas: `src/routes/_authenticated/relatorio.tsx`, `historico.tsx`;
  admin `admin/relatorios.index.tsx`, `admin/exportar.index.tsx`.
- Lógica: `src/lib/ponto-export.ts`, `src/lib/pdf-export.ts` (jsPDF),
  `src/lib/exportacao.functions.ts`, `src/lib/relatorios.ts`.
- Componentes: `src/components/relatorios/*`, `relatorio-filtros.tsx`.
- Hooks: `use-exportar-pontos`, `use-relatorio-filtros`.

## Dependências
- Depende de: ponto, cálculo trabalhista, empresas/colaboradores.

## Status
Em produção.
