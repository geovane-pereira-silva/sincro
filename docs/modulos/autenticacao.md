# Módulo: Autenticação

## O que é
Controle de acesso: login, cadastro, recuperação de senha e definição de
tipo de conta/papel.

## Como funciona
1. Login por email/senha; recuperação via `/reset-password`.
2. Cadastro com confirmação por email (template customizado).
3. `handle_new_user` cria o perfil e vincula colaboradores por email/empresa.

## Quem usa
Todos os tipos de conta.

## Regras de negócio
- Papéis administrativos em `user_roles` (nunca no perfil).
- Sem cadastro anônimo; confirmação de email padrão.
- (BLOCO B3) SSO Microsoft e Apple — PENDENTES.

## Tabelas do banco envolvidas
`profiles`, `user_roles`, `colaboradores`.

## Rotas do sistema
`/auth`, `/reset-password`, `/convite/$token`, gate `_authenticated/route.tsx`.

## Configurações
Provedores de OAuth no backend; templates de email.

## Observações técnicas
`requireSupabaseAuth`; `src/start.ts` anexa o bearer; hooks `use-auth`,
`use-profile`, `use-is-superadmin`.
