# Painel Admin

## O que é
Painel do administrador master (superadmin) para governar todo o sistema:
empresas, usuários, financeiro, auditoria, webhooks e recursos internos.

## Como funciona
1. Admin acessa `/admin` (gate de rota + verificação de papel).
2. Navega entre empresas, usuários, financeiro, auditoria, relatórios, etc.
3. Pode promover outros admins.

## Quem usa
Superadmin (admin master). Inicial: Geovane Pereira.

## Regras de negócio
- Papéis em tabela separada (`user_roles` / `has_role`).
- Superadmin pode criar outros admins.

## Tabelas do banco envolvidas
`user_roles`, `profiles`, `empresas`, `admin_config`, `admin_audit_log`.

## Rotas do sistema
`/admin` e subrotas (`empresas`, `usuarios`, `financeiro`, `auditoria`,
`webhook`, `exportar`, `recursos`, `premium`, `gamificacao`, etc.).

## Configurações
`admin_config`; recursos internos em `/admin/recursos`.

## Observações técnicas
`admin-shell.tsx`, `admin-global-search.tsx`;
`src/lib/admin-actions.functions.ts`, `admins.functions.ts`; hooks `use-admin*`.
