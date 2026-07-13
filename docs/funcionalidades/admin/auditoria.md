# Auditoria — Admin

## O que é
Registro cronológico de ações relevantes no sistema, com exportação, para
rastreabilidade.

## Como funciona
1. Ações sensíveis (aprovações, alterações) geram entradas de auditoria.
2. Admin consulta e filtra os eventos em `/admin/auditoria`.
3. Pode exportar os registros.

## Quem usa
Superadmin (admin master).

## Regras de negócio
- Registros de auditoria não devem ser apagados.
- Leitura restrita ao admin.

## Tabelas do banco envolvidas
`admin_audit_log`, `asaas_webhook_eventos`.

## Rotas do sistema
`/admin/auditoria`, `/admin/webhook`.

## Configurações
Filtros por período/tipo.

## Observações técnicas
`admin/auditoria.index.tsx`; logs também alimentados por
`solicitacoes-actions.functions.ts`.
