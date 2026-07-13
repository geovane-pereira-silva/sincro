# Gestão de Colaboradores — Gestor

## O que é
Cadastro e administração dos colaboradores da empresa, incluindo convites e
vínculo ao perfil.

## Como funciona
1. Gestor/admin cadastra colaboradores e envia convites por email.
2. Ao aceitar, o colaborador cria a conta e é vinculado
   (`colaboradores.user_id`) por email/empresa.
3. Filtros por status: ativos, convite pendente, expirado, demitidos.

## Quem usa
Gestor e admin.

## Regras de negócio
- Convite gera token; reenvio regenera token.
- Trigger `handle_new_user` vincula o colaborador ao perfil na criação da conta.

## Tabelas do banco envolvidas
`colaboradores`, `profiles`, `setores`, `colaborador_jornadas`.

## Rotas do sistema
`/admin/empresas/$id` (aba Colaboradores); portal do gestor.

## Configurações
Setores, jornadas por colaborador.

## Observações técnicas
`colaborador-dialog.tsx`, `convite-colaborador-dialog.tsx`,
`src/lib/convite.functions.ts`; hook `use-convite-actions`.
