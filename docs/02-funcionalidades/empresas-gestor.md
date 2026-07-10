# Empresas e Portal do Gestor

## O que é
Cadastro de empresas (clientes SaaS) e o portal do **gestor** — o usuário
responsável por administrar a jornada dos colaboradores de uma empresa.

## O que ele faz
- Admin cadastra empresas em `/admin/empresas` e ao criar uma empresa é
  **gerado automaticamente um usuário-gestor** com login próprio.
- Gestor acessa `/gestor`: dashboard da equipe, aprovação de solicitações e
  configuração de geolocalização (geofencing).
- Redirecionamento automático de `/ponto` → `/gestor` para contas gestoras.

## Como funciona
- Rotas admin: `src/routes/_authenticated/admin/empresas.{index,nova,$id}.tsx`.
- Rotas gestor: `gestor.index.tsx`, `gestor.solicitacoes.tsx`,
  `gestor.configuracoes.tsx`.
- Server functions: `src/lib/empresas-actions.functions.ts`,
  `src/lib/gestor-admin.functions.ts`; credenciais do gestor via
  `gestor-credenciais-dialog.tsx`.
- Hooks: `use-empresas`, `use-empresa-actions`, `use-gestor-admin`.
- Papel `gestor` com escopo por empresa via RLS.

## Dependências
- Depende de: autenticação/perfis, admin.
- Usado por: colaboradores-convites, solicitações, geolocalização,
  financeiro/assinaturas.

## Status
Em produção.
