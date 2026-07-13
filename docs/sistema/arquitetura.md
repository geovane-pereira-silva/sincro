# Arquitetura

## O que é
Organização do código e das camadas de servidor/cliente do SINCRO.

## Como funciona
Roteamento file-based em `src/routes/`. A subtree `_authenticated/` é protegida
por um gate de auth (`route.tsx`, `ssr: false`). Componentes em
`src/components/`, hooks de dados em `src/hooks/`, lógica em `src/lib/`.

```
src/
  routes/
    __root.tsx              shell HTML + metadados
    index.tsx               landing
    auth.tsx                login/cadastro
    convite.$token.tsx      aceite de convite
    api/public/asaas/webhook.ts
    _authenticated/
      route.tsx             gate de auth
      ponto.tsx, relatorio.tsx, historico.tsx, solicitacoes.tsx
      gestor.index.tsx, gestor.solicitacoes.tsx, gestor.configuracoes.tsx
      admin/                painel admin
  components/  hooks/  lib/
  integrations/supabase/    clients, middleware, types (auto-gerados)
```

## Quem usa
Time de desenvolvimento.

## Regras de negócio
- Clientes Supabase: `client` (browser, RLS), `requireSupabaseAuth` (middleware
  autenticado), `supabaseAdmin` (service role, bypass RLS — só server).
- `src/start.ts` registra o middleware que anexa o bearer token.
- Cálculo central: `calculoTrabalhista.ts` (saldo/faltas/status `futuro`) e
  `ponto.ts` (pares cronológicos, múltiplas batidas).

## Tabelas do banco envolvidas
Todas (ver docs por funcionalidade).

## Rotas do sistema
Ver árvore acima.

## Configurações
N/A.

## Observações técnicas
Não editar: `routeTree.gen.ts`, `integrations/supabase/*` auto-gerados, `.env`,
`supabase/config.toml`.
