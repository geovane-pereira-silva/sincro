# Colaboradores e Convites

## O que é
Cadastro de colaboradores de uma empresa e o fluxo de convite por email para
que criem a própria conta e sejam vinculados ao perfil.

## O que ele faz
- Gestor/admin cadastra colaboradores e envia **convite por email** (via Edge
  Function/Resend); em falha, fallback silencioso copia o link + toast.
- Aba Colaboradores em `/admin/empresas/:id` com **filtros**: Todos / Ativos /
  Convite pendente / Expirado / Demitidos.
- **Reenvio de convite** regenera token (novo UUID) e reenvia o email.
- **Histórico de convites** com exportação CSV.
- Página `/convite/[token]` com UX de stepper (3 passos), estados de token
  expirado ("Solicitar novo convite"), já usado ("faça login") e tela de
  sucesso.
- Ao aceitar o convite, `colaboradores.user_id` é preenchido com `auth.uid()`.

## Como funciona
- Componentes: `colaborador-dialog.tsx`, `convite-colaborador-dialog.tsx`.
- Rota pública de aceite: `src/routes/convite.$token.tsx`.
- Server functions: `src/lib/convite.functions.ts`, `cadastro.functions.ts`.
- Email: `src/lib/email.server.ts` (Resend, secret `RESEND_API_KEY`).
- Tabela `colaboradores` (com `user_id`); trigger `handle_new_user` faz o
  vínculo por email/empresa.
- Hooks: `use-convite-actions`, `use-cadastro-checks`.

## Dependências
- Depende de: autenticação/perfis, empresas-gestor, infraestrutura de email.
- Alimenta: ponto, solicitações (o colaborador criado passa a bater ponto).

## Status
Em produção.
