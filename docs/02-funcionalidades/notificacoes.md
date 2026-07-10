# Notificações e Lembretes

## O que é
Notificações in-app em tempo real e lembretes locais de ponto baseados na
jornada e nas preferências do usuário.

## O que ele faz
- Sino de notificações no header, com badge de não lidas, marcação individual
  e "marcar todas".
- Atualização em **tempo real** (Supabase Realtime) + polling de fallback.
- Notifica eventos de solicitações (criada/aprovada/rejeitada) e lembretes.
- Lembretes locais de entrada/saída/intervalo via Notification API, com
  fallback para toast quando push indisponível.
- Preferências configuráveis (horário, antecedência, push on/off).

## Como funciona
- UI: `src/components/notificacoes-bell.tsx`,
  `src/components/config-notificacoes-form.tsx`.
- Lógica: `src/lib/notificacoes.ts` (ícones/cores/tipos),
  `src/lib/pushNotifications.ts` (agendamento local).
- Hooks: `use-notificacoes` (Realtime), `use-config-notificacoes`,
  `use-lembretes-ponto`.
- Tabelas: `notificacoes`, `config_notificacoes`.

## Dependências
- Depende de: autenticação/perfis, configuração de jornada.
- Consumido por: solicitações (gera notificações), app-shell (sino).

## Status
Em produção.
