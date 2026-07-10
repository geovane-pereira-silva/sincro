# Autenticação e Perfis

## O que é
Controle de acesso do sistema: login, cadastro, recuperação de senha e
definição do tipo de conta/papel de cada usuário.

## O que ele faz
- Login por email/senha e recuperação de senha (`/auth`, `/reset-password`).
- Cadastro de conta com confirmação por email (template customizado —
  ver `docs/email-confirmacao-conta.md`).
- Define o perfil do usuário via `tipo_conta` (autônomo/individual,
  colaborador, gestor) e papéis administrativos via tabela de roles.
- **Admin master:** Geovane Pereira é o superadmin inicial e pode criar
  outros admins.
- Onboarding diferenciado por tipo de conta (colaboradores não veem ajustes
  de jornada pessoal).

## Como funciona
- Rotas: `src/routes/auth.tsx`, `reset-password.tsx`, `convite.$token.tsx`,
  gate em `src/routes/_authenticated/route.tsx`.
- Papéis administrativos ficam em tabela separada (`user_roles` / função
  `has_role`) — **nunca** no perfil, para evitar escalonamento de privilégio.
- Hooks: `use-auth`, `use-profile`, `use-is-superadmin`, `use-admins`.
- Server: `requireSupabaseAuth` (middleware) + `src/start.ts` anexa o bearer.
- Trigger `handle_new_user` vincula colaboradores (`colaboradores.user_id`)
  ao perfil por email/empresa ao criar a conta.

## Dependências
- Base para **todos** os módulos (ponto, solicitações, admin, gestor).
- Convites de colaborador dependem deste módulo (`colaboradores-convites.md`).

## Status
Em produção.
