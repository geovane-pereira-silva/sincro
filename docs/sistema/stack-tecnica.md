# Stack Técnica

## O que é
Conjunto de tecnologias e bibliotecas que sustentam o SINCRO.

## Como funciona
- **Frontend:** React 19 + **TanStack Start** (SSR) sobre **Vite 7**.
  Roteamento file-based (**TanStack Router**), dados com **TanStack Query**.
- **UI:** Tailwind CSS v4 (via `src/styles.css`) + shadcn/ui (Radix).
  Ícones `lucide-react`, toasts `sonner`.
- **Backend:** Lovable Cloud (Supabase) — PostgreSQL + Auth + Storage + Realtime.
- **Lógica de servidor:** server functions (`createServerFn`) para lógica
  interna; server routes em `src/routes/api/public/*` para webhooks/APIs.
- **PDF/planilhas:** `jspdf` + `jspdf-autotable`, `jszip`.
- **Mapas:** Leaflet via CDN (`src/components/leaflet-map.tsx`).
- **Email:** Resend (`src/lib/email.server.ts`, secret `RESEND_API_KEY`).
- **Pagamentos:** Asaas (`src/routes/api/public/asaas/webhook.ts`).

## Quem usa
Time de desenvolvimento (referência técnica).

## Regras de negócio
- `*.functions.ts` = server functions client-safe; `process.env` só dentro de
  `.handler()`.
- `*.server.ts` = helpers apenas de servidor; `supabaseAdmin` carregado via
  `await import()` dentro do handler.

## Tabelas do banco envolvidas
N/A (documento de infraestrutura).

## Rotas do sistema
N/A.

## Configurações
Variáveis `VITE_*` (client) e `process.env.*` (servidor); secrets no backend.

## Observações técnicas
Runtime edge/Worker: evitar pacotes Node-only (child_process, sharp, etc.).
Arquivos auto-gerados não devem ser editados (`types.ts`, `client.ts`, etc.).
