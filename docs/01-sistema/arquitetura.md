# Arquitetura

## Stack
- **Frontend:** React 19 + **TanStack Start** (SSR) sobre **Vite 7**.
  Roteamento file-based com **TanStack Router**; dados com **TanStack Query**.
- **UI:** Tailwind CSS v4 (config via `src/styles.css`) + shadcn/ui (Radix).
  Ícones `lucide-react`. Toasts `sonner`.
- **Backend:** Lovable Cloud (Supabase) — PostgreSQL + Auth + Storage +
  Realtime. Lógica de negócio em **server functions** (`createServerFn`) e,
  para chamadas externas, **server routes** em `src/routes/api/public/*`.
- **PDF/planilhas:** `jspdf` + `jspdf-autotable`, `jszip`.
- **Mapas:** Leaflet carregado via CDN (`src/components/leaflet-map.tsx`).
- **Email:** Resend (`src/lib/email.server.ts`), secret `RESEND_API_KEY`.
- **Pagamentos:** Asaas (webhook em `src/routes/api/public/asaas/webhook.ts`).
- **Hospedagem:** publicado em `sincroapp.lovable.app` (runtime edge/Worker).

## Convenções de código (server)
- `*.functions.ts` — server functions chamadas pelo cliente (client-safe path,
  ex.: `src/lib/`). Handler lê `process.env` **dentro** de `.handler()`.
- `*.server.ts` — helpers apenas de servidor (nunca importados direto por
  componentes). `client.server.ts` = `supabaseAdmin` (service role, bypass RLS)
  — carregar via `await import()` dentro do handler.
- Clientes Supabase: `@/integrations/supabase/client` (browser, RLS),
  `requireSupabaseAuth` (middleware autenticado), `supabaseAdmin` (admin).
- `src/start.ts` registra o middleware que anexa o bearer token do Supabase.

## Estrutura de pastas (resumo)
```
src/
  routes/                       rotas file-based (TanStack)
    __root.tsx                  shell HTML + metadados
    index.tsx                   landing
    auth.tsx                    login/cadastro
    convite.$token.tsx          aceite de convite de colaborador
    reset-password.tsx, ref.$code.tsx
    api/public/asaas/webhook.ts webhook Asaas
    _authenticated/             subtree protegida (route gate)
      route.tsx                 gate de auth
      ponto.tsx                 marcação de ponto
      relatorio.tsx             espelho de ponto / relatório
      historico.tsx, editar.$id.tsx, configuracoes.tsx, planos.tsx
      solicitacoes.tsx          solicitações do colaborador
      gestor.index.tsx / gestor.solicitacoes.tsx / gestor.configuracoes.tsx
      admin/                    painel admin (empresas, usuários, financeiro,
                                auditoria, webhook, exportar, recursos, etc.)
  components/                   UI e diálogos (shadcn + específicos)
  hooks/                        hooks de dados (use-*)
  lib/                          lógica: cálculo trabalhista, ponto, solicitações,
                                geolocalização, exportação, server functions
  integrations/supabase/        clients, middleware, types (auto-gerados)
```

## Regras trabalhistas (lógica central)
- `src/lib/calculoTrabalhista.ts` — saldo, faltas, status do dia. Dias
  **futuros** retornam 0 (não geram falta/negativo).
- `src/lib/ponto.ts` — pares de batidas cronológicos, suporte a múltiplos
  pontos (4 por padrão, ampliável até 10 conforme batidas).
- Ordenação automática: ao salvar, pontos são ordenados por horário e os
  papéis (entrada/intervalo/saída) reatribuídos (`ponto-dia-editor.tsx`).

## Não editar (auto-gerado)
`src/routeTree.gen.ts`, `src/integrations/supabase/{client,client.server,
auth-middleware,auth-attacher,types}.ts`, `.env`, `supabase/config.toml`.
