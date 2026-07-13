# Notificações — Colaborador

## O que é
Notificações in-app em tempo real e lembretes locais de ponto para o
colaborador.

## Como funciona
1. Sino no header exibe notificações com badge de não lidas.
2. Eventos de solicitações (criada/aprovada/rejeitada) geram notificações.
3. Lembretes locais de entrada/saída/intervalo conforme a jornada.

## Quem usa
Colaborador (e demais tipos de conta).

## Regras de negócio
- Realtime via Supabase + polling de fallback.
- Lembretes usam Notification API/Service Worker; fallback para toast.
- (BLOCO B7) Push com app fechado (Web Push/VAPID) — PENDENTE.

## Tabelas do banco envolvidas
`notificacoes`, `config_notificacoes`.

## Rotas do sistema
Header (sino) em todas as telas autenticadas; `/configuracoes`.

## Configurações
Preferências de lembrete (horário, antecedência, push on/off).

## Observações técnicas
`notificacoes-bell.tsx`, `config-notificacoes-form.tsx`,
`src/lib/pushNotifications.ts`; hooks `use-notificacoes`, `use-lembretes-ponto`.
