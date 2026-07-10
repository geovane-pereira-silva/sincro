# Administração (Painel Admin / Superadmin)

## O que é
Painel do administrador master do sistema (o criador) para gerir empresas,
usuários, financeiro, auditoria, webhooks e recursos internos.

## O que ele faz
- Gerência de empresas e usuários (`admin/empresas.*`, `admin/usuarios.*`).
- Gestão de outros admins (superadmin pode promover novos admins).
- **Auditoria** com exportação (`admin/auditoria.index.tsx`).
- Teste/validação de **webhook Asaas** (`admin/webhook.index.tsx`).
- **Exportação** de pontos por período (`admin/exportar.index.tsx`).
- **Recursos internos** (`admin/recursos.index.tsx`): URLs de webhook, links de
  documentação (plan.md, algoritmos), gestão de superadmins.
- Financeiro, premium, gamificação, registros, relatórios, suporte, config.

## Como funciona
- Shell: `src/components/admin-shell.tsx`, busca global
  `admin-global-search.tsx`, UI utilitária `admin-ui.tsx`.
- Gate de rota: `src/routes/_authenticated/admin/route.tsx`.
- Server functions: `src/lib/admin-actions.functions.ts`, `admins.functions.ts`,
  `gestor-admin.functions.ts`.
- Hooks: `use-admin`, `use-admin-actions`, `use-admin-config`, `use-admins`,
  `use-is-superadmin`.
- Papéis em tabela separada (`user_roles`/`has_role`). Admin master inicial:
  **Geovane Pereira**.

## Dependências
- Depende de: autenticação/perfis.
- Governa: empresas-gestor, financeiro, auditoria de todos os módulos.

## Status
Em produção.
