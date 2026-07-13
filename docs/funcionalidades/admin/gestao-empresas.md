# Gestão de Empresas — Admin

## O que é
Cadastro e administração das empresas clientes do SaaS, com geração automática
do usuário-gestor.

## Como funciona
1. Admin cadastra a empresa em `/admin/empresas/nova`.
2. Ao criar, é gerado automaticamente um usuário-gestor com login próprio.
3. Admin gerencia colaboradores, jornadas e status pela página da empresa.

## Quem usa
Superadmin (admin master).

## Regras de negócio
- Cada empresa tem um usuário-gestor.
- Escopo por empresa aplicado via RLS.

## Tabelas do banco envolvidas
`empresas`, `profiles`, `colaboradores`, `jornadas_empresa`, `user_roles`.

## Rotas do sistema
`/admin/empresas`, `/admin/empresas/nova`, `/admin/empresas/$id`.

## Configurações
Dados da empresa, jornadas, credenciais do gestor.

## Observações técnicas
`empresa-form-dialog.tsx`, `gestor-credenciais-dialog.tsx`;
`src/lib/empresas-actions.functions.ts`, `gestor-admin.functions.ts`.
